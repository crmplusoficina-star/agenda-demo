// "Servidor" da demonstração: gatilhos, funções (RPC) e edge functions
// reproduzidos no navegador, com as mesmas regras do sistema oficial.
import { DemoDb, uuid, helpers } from './engine';
import type { Row } from './engine';
import { BRANCH_BASE, CITY_COORDS, buildSeed, isoDay } from './seed';

const fold = helpers.fold;
const norm = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
const NO_PENDING_REASONS = new Set(['Férias', 'Folga', 'Sem agenda', 'Treinamento', 'Manutenção carro', 'Retorno à filial']);
const nowIso = () => new Date().toISOString();
const todayIso = () => isoDay(new Date());

function coordsFor(city?: string | null) {
  const key = norm(city);
  return key ? CITY_COORDS[key] : undefined;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (v: number) => v * Math.PI / 180;
  const dLat = rad(b.lat - a.lat); const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function weekStartIso(dateIso: string) {
  const d = new Date(`${dateIso}T12:00:00`);
  const dow = d.getDay(); d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return isoDay(d);
}

const PK: Record<string, string[]> = {
  app_users: ['matricula'], app_branches: ['name'], inspection_150h: ['pin'], client_contacts: ['client_key'],
  agenda_share_user_defaults: ['matricula'], aria_user_state: ['matricula'], client_location_overrides: ['client_key'],
  client_address_enrichment: ['client_key'], agenda_route_metrics: ['appointment_id'], service_campaigns: ['code'],
  aria_intent_memory: ['phrase_key', 'intent'], aria_aliases: ['kind', 'alias'], g4_client_summary: ['client_key'],
  g4_machine_summary: ['serial'], app_user_branches: ['matricula', 'branch'],
};

function defaults(table: string, row: Row): Row {
  const now = nowIso();
  const withId = (r: Row) => (r.id ? r : { id: uuid(), ...r });
  switch (table) {
    case 'appointments':
      return withId({ status: 'planejado', client_name: null, equipment_serial: null, service_city: null, service_reason: null, description: null, reported_hourmeter: null, forecast_amount: 0, billing_status: '-', created_at: now, ...row });
    case 'technicians':
      return withId({ active: true, created_at: now, ...row });
    case 'followups':
      return withId({ equipment_serial: null, action_date: todayIso(), treatment_type: 'retorno', status: 'contato_realizado', estimated_value: null, next_followup_date: null, notes: null, stage: 'prospectar', result: null, sale_kind: null, parts_value: null, services_value: null, lost_reason: null, created_by_matricula: null, created_by_name: null, updated_by_matricula: null, updated_by_name: null, created_at: now, updated_at: now, ...row });
    case 'ai_insights':
      return withId({ status: 'new', presentation_level: 2, priority: 'normal', created_at: now, fingerprint: null, rationale: {}, ...row });
    case 'aria_learning':
      return withId({ active: true, created_at: now, ...row });
    case 'campaign_machines':
      return withId({ recommendation: 'Recommended', programmed_date: null, executed_date: null, programmed_by_agenda: false, executed_by_agenda: false, notes: null, updated_at: now, ...row });
    default:
      if (PK[table]) return { updated_at: now, ...row };
      return withId({ created_at: now, ...row });
  }
}

function campaignMatches(serial: string, c: Row) {
  const s = norm(serial);
  if (!s) return false;
  if (norm(c.pin) === s) return true;
  const sn = norm(c.serial_number); const model = norm(c.model).replace(/-/g, '').match(/^[A-Z]+[0-9]+/)?.[0] || '';
  return sn.length >= 4 && Boolean(model) && s.endsWith(sn) && s.includes(model);
}

function activeCampaign(db: DemoDb, code: string) {
  return db.table('service_campaigns').some((s) => s.code === code && s.active);
}

// Gatilho: a Agenda programa/executa Visita 150h e Campanha e gera os insights da ArIA
function syncServicePrograms(db: DemoDb, appt: Row, before: Row | null) {
  const serial = norm(appt.equipment_serial);
  const done = appt.status === 'concluido';
  const apply = (row: Row) => {
    if (row.programmed_date == null || row.programmed_by_agenda) { row.programmed_date = appt.appointment_date; row.programmed_by_agenda = true; }
    if (done && (row.executed_date == null || row.executed_by_agenda)) { row.executed_date = appt.appointment_date; row.executed_by_agenda = true; }
    else if (!done && row.executed_by_agenda && row.appointment_id === appt.id) { row.executed_date = null; row.executed_by_agenda = false; }
    row.appointment_id = appt.id; row.updated_at = nowIso();
  };
  if (appt.service_reason === 'Visita 150h' && serial) for (const r of db.table('inspection_150h')) if (norm(r.pin) === serial) apply(r);
  if (appt.service_reason === 'Campanha de campo' && serial) for (const r of db.table('campaign_machines')) if (campaignMatches(serial, r) && activeCampaign(db, r.campaign_code)) apply(r);

  const changed = !before || before.equipment_serial !== appt.equipment_serial || before.service_city !== appt.service_city;
  if (!changed || NO_PENDING_REASONS.has(String(appt.service_reason || ''))) return;
  const expires = new Date(new Date(`${appt.appointment_date}T23:59:59`).getTime() + 15 * 86400000).toISOString();

  if (serial) {
    const items: string[] = [];
    for (const i of db.table('inspection_150h')) {
      if (norm(i.pin) === serial && i.executed_date == null && appt.service_reason !== 'Visita 150h') items.push(`Inspeção 150h pendente (ET ${String(i.delivery_date).split('-').reverse().join('/')})`);
    }
    for (const c of db.table('campaign_machines')) {
      if (campaignMatches(serial, c) && c.executed_date == null && activeCampaign(db, c.campaign_code) && appt.service_reason !== 'Campanha de campo') items.push(`Campanha ${c.campaign_code} pendente`);
    }
    if (items.length) {
      const text = items.join('; ');
      db.insertRaw('ai_insights', [{ appointment_id: appt.id, technician_id: appt.technician_id, branch: appt.branch, insight_type: 'alerta', priority: 'alta', presentation_level: 3, title: 'ArIA: oportunidade nesta máquina', message: `Aproveite a visita: ${text}.`, rationale: { serial, pendencias: text }, fingerprint: `pend|${appt.id}|maquina|${serial}|${text}`, generated_by: 'rules', expires_at: expires }]);
    }
  }
  const city = fold(appt.service_city);
  if (city) {
    const items: string[] = [];
    for (const i of db.table('inspection_150h')) if (fold(i.city) === city && i.executed_date == null && norm(i.pin) !== serial) items.push(`${i.client_name || i.pin} (150h)`);
    for (const c of db.table('campaign_machines')) if (fold(c.city) === city && c.executed_date == null && activeCampaign(db, c.campaign_code) && !campaignMatches(serial, c)) items.push(`${c.client_name || `${c.model}-${c.serial_number}`} (campanha ${c.campaign_code})`);
    if (items.length) {
      db.insertRaw('ai_insights', [{ appointment_id: appt.id, technician_id: appt.technician_id, branch: appt.branch, insight_type: 'comercial', priority: 'normal', presentation_level: 2, title: 'ArIA: pendências na mesma cidade', message: `${items.length} máquina(s) com pendência em ${appt.service_city}: ${items.slice(0, 5).join('; ')}${items.length > 5 ? '…' : ''}`, rationale: { city: appt.service_city, total: items.length }, fingerprint: `pend|${appt.id}|cidade|${city}|${items.length}`, generated_by: 'rules', expires_at: expires }]);
    }
  }
}

// Gatilho: distância de cada atendimento a partir do anterior da semana (ou da filial)
function recomputeRoutes(db: DemoDb, technicianId: string, weekStart: string) {
  const end = isoDay(new Date(new Date(`${weekStart}T12:00:00`).getTime() + 6 * 86400000));
  const items = db.table('appointments')
    .filter((a) => a.technician_id === technicianId && a.appointment_date >= weekStart && a.appointment_date <= end)
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || String(a.created_at).localeCompare(String(b.created_at)));
  const ids = new Set(items.map((a) => a.id));
  db.tables.agenda_route_metrics = db.table('agenda_route_metrics').filter((m) => !ids.has(m.appointment_id));
  let originLabel = ''; let origin: { lat: number; lng: number } | undefined; let originKind = 'branch'; let originId: string | null = null;
  const tech = db.table('technicians').find((t) => t.id === technicianId);
  const baseCity = BRANCH_BASE[tech?.branch] || '';
  originLabel = `Filial ${tech?.branch || ''}`.trim(); origin = coordsFor(baseCity);
  for (const a of items) {
    const dest = coordsFor(a.service_city);
    const travel = ['Férias', 'Folga', 'Sem agenda'].includes(String(a.service_reason || ''));
    let row: Row;
    if (travel) row = { status: 'ignored', distance_km: null, duration_min: null };
    else if (!dest || !origin) row = { status: 'location_missing', distance_km: null, duration_min: null };
    else {
      const km = Math.round(haversineKm(origin, dest) * 1.28 * 10) / 10;
      row = { status: 'ready', distance_km: km, duration_min: Math.round(km / 58 * 60) };
    }
    db.table('agenda_route_metrics').push({
      appointment_id: a.id, technician_id: technicianId, appointment_date: a.appointment_date, week_start: weekStart,
      origin_kind: originKind, origin_appointment_id: originId, origin_label: originLabel,
      destination_label: a.service_city || null, destination_city: a.service_city || null, destination_state: dest?.state || null,
      provider: 'demo', segment_key: `${technicianId}|${weekStart}|${a.id}`, calculated_at: nowIso(), ...row,
    });
    if (dest && !travel) { origin = dest; originLabel = String(a.service_city); originKind = 'appointment'; originId = a.id; }
  }
}

function afterWrite(table: string, op: 'insert' | 'update' | 'delete', rows: Row[], before: Row[], db: DemoDb) {
  if (table === 'appointments') {
    const weeks = new Set<string>();
    rows.forEach((row, i) => {
      if (op === 'delete') {
        db.tables.ai_insights = db.table('ai_insights').filter((x) => x.appointment_id !== row.id);
      } else {
        syncServicePrograms(db, row, op === 'update' ? before[i] : null);
      }
      weeks.add(`${row.technician_id}|${weekStartIso(row.appointment_date)}`);
      if (op === 'update' && before[i]) weeks.add(`${before[i].technician_id}|${weekStartIso(before[i].appointment_date)}`);
    });
    for (const key of weeks) { const [tech, week] = key.split('|'); recomputeRoutes(db, tech, week); }
    db.notify('agenda_route_metrics'); db.notify('ai_insights');
  }
  if (table === 'followups' && op !== 'delete') {
    for (const f of rows) {
      db.table('followup_updates').push({ id: uuid(), followup_id: f.id, stage: f.stage, result: f.result, notes: f.notes, next_followup_date: f.next_followup_date, sale_kind: f.sale_kind, parts_value: f.parts_value, services_value: f.services_value, lost_reason: f.lost_reason, actor_matricula: f.updated_by_matricula || f.created_by_matricula, actor_name: f.updated_by_name || f.created_by_name, created_at: nowIso() });
    }
  }
}

function beforeInsert(table: string, row: Row, db: DemoDb) {
  if (table !== 'ai_insights') return true;
  // Sininho: só oportunidades da ArIA (campanha/150h) e "dia sem programação"
  if (!String(row.fingerprint || '').startsWith('pend|') && !(row.rationale && 'free_date' in row.rationale)) return false;
  if (row.fingerprint && db.table('ai_insights').some((x) => x.fingerprint === row.fingerprint)) return false;
  return true;
}

// Ao reiniciar, a semente passa pelos mesmos gatilhos (gera os insights e as distâncias)
function seed() {
  const tables = buildSeed();
  const temp = new DemoDb({ seed: () => tables, defaults, primaryKey: (t) => PK[t] || ['id'], afterWrite, beforeInsert }, false);
  temp.tables = tables;
  const appts = [...tables.appointments];
  for (const a of appts) syncServicePrograms(temp, a, null);
  const weeks = new Set(appts.map((a) => `${a.technician_id}|${weekStartIso(a.appointment_date)}`));
  for (const key of weeks) { const [tech, week] = key.split('|'); recomputeRoutes(temp, tech, week); }
  // Insight de "dia sem programação" para mostrar o outro tipo do sininho
  const gap = appts.find((a) => a.technician_id === 'tec-demo-2' && a.service_reason === 'Aplicação de peças');
  if (gap) temp.insertRaw('ai_insights', [{ appointment_id: gap.id, technician_id: gap.technician_id, branch: gap.branch, insight_type: 'planejamento', priority: 'normal', presentation_level: 2, title: 'Dia sem programação na região', message: 'Existe um dia sem programação na semana do Técnico Bruno. Talvez valha avaliar visita a clientes inativos, inspeção ou treinamento.', rationale: { free_date: gap.appointment_date }, fingerprint: `gap|${gap.id}` }]);
  return temp.tables;
}

export const db = new DemoDb({ seed, defaults, primaryKey: (t) => PK[t] || ['id'], afterWrite, beforeInsert });

// ---------------- RPCs ----------------
type RpcResult = { data: any; error: { message: string } | null };
const ok = (data: any = { ok: true }): RpcResult => ({ data, error: null });
const fail = (message: string): RpcResult => ({ data: null, error: { message } });
const actorOk = (actor: unknown) => db.table('app_users').some((u) => u.matricula === String(actor || '').replace(/\D/g, '') && u.active);

const rpcs: Record<string, (args: any) => RpcResult> = {
  update_service_program(a) {
    if (!actorOk(a.p_actor)) return fail('usuário sem acesso');
    const list = a.p_kind === '150h' ? db.table('inspection_150h').filter((r) => r.pin === a.p_id) : a.p_kind === 'campanha' ? db.table('campaign_machines').filter((r) => String(r.id) === String(a.p_id)) : null;
    if (!list) return fail(`tipo inválido: ${a.p_kind}`);
    const programmed = a.p_programmed || a.p_executed || null;
    for (const r of list) {
      r.programmed_by_agenda = r.programmed_by_agenda && r.programmed_date === programmed;
      r.executed_by_agenda = r.executed_by_agenda && r.executed_date === (a.p_executed || null);
      r.programmed_date = programmed; r.executed_date = a.p_executed || null;
      r.notes = String(a.p_notes || '').trim() || null;
      if (a.p_city !== undefined && a.p_city !== null) r.service_city = String(a.p_city).trim() || null;
      r.updated_at = nowIso();
    }
    db.persist(); db.notify(a.p_kind === '150h' ? 'inspection_150h' : 'campaign_machines');
    return ok({ ok: true, updated: list.length });
  },
  admin_save_campaign_machine(a) {
    if (!actorOk(a.p_actor)) return fail('usuário sem acesso');
    if (!db.table('service_campaigns').some((s) => s.code === a.p_campaign)) db.table('service_campaigns').push({ code: a.p_campaign, description: a.p_description || null, active: true });
    const machine = db.table('g4_machine_summary').find((m) => norm(m.serial) === norm(a.p_pin) || norm(m.serial).endsWith(norm(a.p_serial_number)));
    db.insertRaw('campaign_machines', [{ campaign_code: a.p_campaign, branch: a.p_branch, model: a.p_model, serial_number: a.p_serial_number, pin: a.p_pin || machine?.serial || null, recommendation: a.p_recommendation || 'Recommended', repair_deadline: null, last_visit: machine?.last_service_at || null, opportunity_lost: false, client_name: machine?.client_name || null, city: machine?.city || null, service_city: machine?.city || null }]);
    db.persist(); db.notify('campaign_machines');
    return ok();
  },
  admin_delete_campaign_machine(a) {
    if (!actorOk(a.p_actor)) return fail('usuário sem acesso');
    db.tables.campaign_machines = db.table('campaign_machines').filter((r) => String(r.id) !== String(a.p_id));
    db.persist(); db.notify('campaign_machines');
    return ok();
  },
  admin_set_branch_active(a) {
    const b = db.table('app_branches').find((r) => r.name === a.p_branch);
    if (b) b.active = Boolean(a.p_active);
    db.persist(); return ok();
  },
  admin_save_user(a) {
    const users = db.table('app_users');
    const existing = users.find((u) => u.matricula === a.p_matricula);
    if (existing) Object.assign(existing, { name: a.p_name, role: a.p_role });
    else users.push({ matricula: a.p_matricula, name: a.p_name, role: a.p_role, active: true });
    db.tables.app_user_branches = db.table('app_user_branches').filter((r) => r.matricula !== a.p_matricula);
    for (const branch of a.p_branches || []) db.table('app_user_branches').push({ matricula: a.p_matricula, branch });
    db.persist(); return ok();
  },
  admin_set_user_active(a) {
    const u = db.table('app_users').find((r) => r.matricula === a.p_matricula);
    if (u) u.active = Boolean(a.p_active);
    db.persist(); return ok();
  },
  aria_intent_feedback(a) {
    const key = (a.p_tokens || []).join(' ');
    const rows = db.table('aria_intent_memory');
    let row = rows.find((r) => r.phrase_key === key && r.intent === a.p_intent);
    if (!row) { row = { id: rows.length + 1, phrase_key: key, tokens: a.p_tokens || [], sample: a.p_sample, intent: a.p_intent, positive: 0, negative: 0, users: [], created_at: nowIso(), last_used_at: nowIso() }; rows.push(row); }
    if (Number(a.p_signal) > 0) row.positive += 1; else if (Number(a.p_signal) < 0) row.negative += 1;
    if (a.p_actor && !row.users.includes(a.p_actor)) row.users.push(a.p_actor);
    row.last_used_at = nowIso(); row.sample = a.p_sample || row.sample;
    db.persist(); return ok();
  },
  aria_save_alias(a) {
    const rows = db.table('aria_aliases');
    const existing = rows.find((r) => r.kind === a.p_kind && r.alias === a.p_alias);
    if (existing) { existing.value = a.p_value; existing.uses = (existing.uses || 0) + 1; existing.last_used_at = nowIso(); }
    else rows.push({ id: rows.length + 1, kind: a.p_kind, alias: a.p_alias, value: a.p_value, uses: 1, created_by: a.p_actor, created_at: nowIso(), last_used_at: nowIso() });
    db.persist(); return ok();
  },
  aria_learn_from_chat(a) {
    db.insertRaw('aria_learning', [{ original_question: a.p_original_question, original_answer: a.p_original_answer, correction: a.p_correction, normalized_question: fold(a.p_original_question), created_by_matricula: a.p_created_by_matricula, created_by_name: a.p_created_by_name }]);
    db.persist(); return ok();
  },
};

// ---------------- Edge functions ----------------
function mapContext(body: any) {
  const clients = Array.isArray(body?.clients) ? body.clients : [];
  const appointments = Array.isArray(body?.appointments) ? body.appointments : [];
  const selected = typeof body?.technician_id === 'string' ? body.technician_id : '';
  const locations = new Map(db.table('g4_client_location_summary').map((r) => [r.client_key, r]));
  const points: Row[] = [];
  const jitter = (key: string, salt: number) => {
    let h = salt; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
    return ((Math.abs(h) % 1000) / 1000 - 0.5) * 0.06;
  };
  const branches = new Set<string>([...clients.map((c: Row) => c.branch), ...appointments.map((a: Row) => a.branch)].filter(Boolean));
  for (const branch of branches) {
    const base = coordsFor(BRANCH_BASE[branch]);
    if (base) points.push({ id: `branch:${branch}`, kind: 'branch', lat: base.lat, lng: base.lng, precision: 'city', branch, name: `Base ${branch}`, city: BRANCH_BASE[branch], state: base.state });
  }
  for (const a of appointments) {
    const city = a.service_city || locations.get(`${norm(a.client_name)}|${norm(a.branch)}`)?.city;
    const c = coordsFor(city);
    if (!c) continue;
    points.push({ id: `appointment:${a.id}`, kind: 'appointment', lat: c.lat, lng: c.lng, precision: 'city', location_source: 'demo', location_label: city, location_uncertain: false, ...a, city, state: c.state });
  }
  for (const cl of clients) {
    const loc = locations.get(cl.client_key);
    const city = cl.city || loc?.city;
    const c = coordsFor(city);
    if (!c) continue;
    points.push({ id: `client:${cl.client_key}`, kind: 'client', lat: c.lat + jitter(cl.client_key, 7), lng: c.lng + jitter(cl.client_key, 13), precision: 'exact', location_source: 'demo', location_label: `${loc?.address || 'Endereço de exemplo'} · ${city}`, ...cl, city, state: c.state });
  }
  const located = points.filter((p) => p.kind === 'client').length;
  return { points, route: selected ? null : null, unresolved: Math.max(0, clients.length - located), uncertain_appointments: 0, geocoded_now: 0, exact_external_calls: 0, requested_clients: clients.length, located_clients: located };
}

function agendaInsights(body: any) {
  const appt = db.table('appointments').find((a) => a.id === body?.appointment_id);
  if (!appt) return { error: 'Atendimento não encontrado' };
  // Regra de "dia sem programação entre atendimentos na mesma cidade"
  const city = norm(appt.service_city);
  if (!city) return { result: 'NO_INSIGHT', generated_by: 'rules' };
  const agenda = db.table('appointments').filter((a) => a.technician_id === appt.technician_id).sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
  const dates = new Set(agenda.map((a) => a.appointment_date));
  const before = [...agenda].reverse().find((a) => a.appointment_date < appt.appointment_date && norm(a.service_city) === city);
  const after = agenda.find((a) => a.appointment_date > appt.appointment_date && norm(a.service_city) === city);
  if (before && after) {
    const d = new Date(`${before.appointment_date}T12:00:00`);
    for (d.setDate(d.getDate() + 1); isoDay(d) < after.appointment_date; d.setDate(d.getDate() + 1)) {
      if (!dates.has(isoDay(d))) {
        const free = isoDay(d);
        const added = db.insertRaw('ai_insights', [{ appointment_id: appt.id, technician_id: appt.technician_id, branch: appt.branch, insight_type: 'planejamento', priority: 'normal', presentation_level: 2, title: 'Dia sem programação na região', message: `Existe um dia sem programação entre atendimentos em ${appt.service_city}. Talvez valha avaliar visita, inspeção, treinamento ou outro uso do período.`, rationale: { free_date: free, city: appt.service_city }, fingerprint: `gap|${appt.id}|${free}` }]);
        db.persist(); db.notify('ai_insights');
        return added.length ? { result: 'INSIGHT', insight_id: added[0].id, generated_by: 'rules' } : { result: 'EXISTING' };
      }
    }
  }
  return { result: 'NO_INSIGHT', generated_by: 'rules' };
}

// Palavras do problema descrito → oportunidade (o oficial usa um modelo de IA; a demo usa regras)
const COMMERCIAL_RULES: { re: RegExp; category: string; title: string; message: string; confidence: number }[] = [
  { re: /vaz|mangueir|hidraul/, category: 'hydraulic', title: 'Oportunidade: revisão do sistema hidráulico', message: 'O relato indica vazamento ou desgaste hidráulico. Vale levar kit de mangueiras e orçar a revisão do sistema na mesma visita.', confidence: 0.8 },
  { re: /rodante|esteira|sapata|rolete/, category: 'undercarriage', title: 'Oportunidade: material rodante', message: 'O relato cita o material rodante. Aproveite para medir o desgaste e orçar a troca preventiva.', confidence: 0.78 },
  { re: /fumac|motor|potenc|aquec|temperatur/, category: 'engine', title: 'Oportunidade: diagnóstico de motor', message: 'Sintomas de motor no relato. Vale propor análise de óleo e revisão preventiva do motor.', confidence: 0.72 },
  { re: /freio|frenag/, category: 'brakes', title: 'Oportunidade: sistema de freio', message: 'O relato cita o freio. Verifique também se a máquina tem campanha de freio pendente.', confidence: 0.7 },
  { re: /ar.?condicionado|cabine|climatiz/, category: 'cab', title: 'Oportunidade: conforto da cabine', message: 'Problema na cabine relatado. Vale oferecer a revisão do ar-condicionado e a troca de filtros.', confidence: 0.62 },
];
function commercialInsight(body: any) {
  const text = fold(`${body?.service_reason || ''} ${body?.description || ''}`);
  const rule = COMMERCIAL_RULES.find((r) => r.re.test(text));
  if (!rule) return { useful: false };
  return { useful: true, source: 'demo', category: rule.category, title: rule.title, message: rule.message, confidence: rule.confidence };
}

const edge: Record<string, (body: any) => any> = {
  'retention-map-context': mapContext,
  'agenda-insights': agendaInsights,
  'aria-agent': () => ({ ok: false, reason: 'no_llm' }), // a ArIA usa o interpretador local
  'aria-commercial-insight': commercialInsight,
  'agenda-route-worker': () => ({ ok: true, mode: 'demo' }),
  'enrich-client-addresses': () => ({ ok: true, mode: 'demo' }),
};

const later = <T,>(value: T, ms = 60) => new Promise<T>((resolve) => window.setTimeout(() => resolve(value), ms));

type Channel = { on: (...args: any[]) => Channel; subscribe: () => Channel; unsubscribe: () => void };

export const demoClient = {
  from: (table: string) => db.from(table),
  rpc: (name: string, args?: any) => {
    const handler = rpcs[name];
    return later(handler ? handler(args || {}) : fail(`Função ${name} não existe na demo`));
  },
  functions: {
    invoke: (name: string, options?: { body?: any }) => {
      const handler = edge[name];
      if (!handler) return later({ data: null, error: { message: `Função ${name} não existe na demo` } });
      try { return later({ data: handler(options?.body), error: null }, 120); }
      catch (error) { return later({ data: null, error: { message: error instanceof Error ? error.message : String(error) } }); }
    },
  },
  channel: (_name: string): Channel => {
    const handlers: { table: string; cb: () => void }[] = [];
    let off: (() => void) | null = null;
    const channel: Channel = {
      on: (_type: string, filter: { table?: string }, cb: () => void) => { handlers.push({ table: filter?.table || '*', cb }); return channel; },
      subscribe: () => { off = db.onChange((table) => handlers.forEach((h) => { if (h.table === '*' || h.table === table) h.cb(); })) as () => void; return channel; },
      unsubscribe: () => { off?.(); off = null; },
    };
    return channel;
  },
  removeChannel: (channel: Channel) => { channel?.unsubscribe(); return Promise.resolve('ok'); },
};

export function resetDemo() {
  db.reset();
  try {
    for (const key of Object.keys(localStorage)) if (key !== 'agenda-demo-db-v1' && key !== 'agenda-demo-matricula' && /^(agenda|aria|retention|map)/i.test(key)) localStorage.removeItem(key);
  } catch { /* sem armazenamento */ }
}
