// Dados fictícios da demonstração. Todas as datas são calculadas a partir de hoje,
// então a demo sempre parece "atual" ao ser reiniciada.
import type { Row, Tables } from './engine';
import { uuid } from './engine';

export const DEMO_BRANCHES = ['DEMO NORTE', 'DEMO NORDESTE'];

export const CITY_COORDS: Record<string, { lat: number; lng: number; state: string }> = {
  'BELEM': { lat: -1.4558, lng: -48.4902, state: 'PA' },
  'ANANINDEUA': { lat: -1.3656, lng: -48.3722, state: 'PA' },
  'MARITUBA': { lat: -1.3553, lng: -48.3422, state: 'PA' },
  'BENEVIDES': { lat: -1.3611, lng: -48.2447, state: 'PA' },
  'CASTANHAL': { lat: -1.2939, lng: -47.9264, state: 'PA' },
  'MOJU': { lat: -1.8839, lng: -48.7669, state: 'PA' },
  'BARCARENA': { lat: -1.5058, lng: -48.6258, state: 'PA' },
  'PARAGOMINAS': { lat: -2.9967, lng: -47.3533, state: 'PA' },
  'FORTALEZA': { lat: -3.7319, lng: -38.5267, state: 'CE' },
  'CAUCAIA': { lat: -3.7361, lng: -38.6531, state: 'CE' },
  'MARACANAU': { lat: -3.8767, lng: -38.6256, state: 'CE' },
  'ITAITINGA': { lat: -3.9686, lng: -38.5281, state: 'CE' },
  'SOBRAL': { lat: -3.6894, lng: -40.3483, state: 'CE' },
  'BATURITE': { lat: -4.3283, lng: -38.8847, state: 'CE' },
  'HORIZONTE': { lat: -4.0983, lng: -38.4906, state: 'CE' },
};

export const BRANCH_BASE: Record<string, string> = { 'DEMO NORTE': 'Ananindeua', 'DEMO NORDESTE': 'Fortaleza' };

const DAY = 86400000;
export function isoDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function daysAgo(n: number) { return isoDay(new Date(Date.now() - n * DAY)); }
function daysAhead(n: number) { return isoDay(new Date(Date.now() + n * DAY)); }
function stamp(n: number) { return new Date(Date.now() - n * DAY).toISOString(); }
function monday(offsetWeeks = 0) {
  const d = new Date(); d.setHours(12, 0, 0, 0);
  const dow = d.getDay(); const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff + offsetWeeks * 7);
  return d;
}
function weekDay(week: number, index: number) { const d = monday(week); d.setDate(d.getDate() + index); return isoDay(d); }

type ClientSpec = {
  name: string; branch: string; city: string; daysSince: number; services: number;
  machines: { serial: string; model: string; hours: number; delivered?: number }[];
};

// Faixas de tempo sem atendimento: até 3 meses, 3–6, 6–12, 12–18 e +18 meses.
const CLIENTS: ClientSpec[] = [
  // ---------- DEMO NORTE ----------
  { name: 'CONSTRUTORA EXEMPLO NORTE LTDA', branch: 'DEMO NORTE', city: 'Benevides', daysSince: 35, services: 14, machines: [
    { serial: 'VCEL60HDEMO0001', model: 'L60H', hours: 6120 }, { serial: 'VCEC220DDEMO0002', model: 'EC220DL', hours: 8350 }] },
  { name: 'TERRAPLANAGEM MODELO S.A.', branch: 'DEMO NORTE', city: 'Benevides', daysSince: 20, services: 6, machines: [
    { serial: 'VCEL90HDEMO0003', model: 'L90H', hours: 140, delivered: 40 }] },
  { name: 'MINERACAO DEMONSTRACAO S.A.', branch: 'DEMO NORTE', city: 'Barcarena', daysSince: 70, services: 22, machines: [
    { serial: 'VCEA30GDEMO0004', model: 'A30G', hours: 12850 }, { serial: 'VCEA30GDEMO0005', model: 'A30G', hours: 11920 }, { serial: 'VCEEC480DEMO0006', model: 'EC480EL', hours: 9640 }] },
  { name: 'AGROPECUARIA FICTICIA LTDA', branch: 'DEMO NORTE', city: 'Castanhal', daysSince: 55, services: 5, machines: [
    { serial: 'SDLGL956DEMO0007', model: 'L956F', hours: 4210 }] },
  { name: 'MADEIREIRA EXEMPLO DO PARA LTDA', branch: 'DEMO NORTE', city: 'Moju', daysSince: 130, services: 9, machines: [
    { serial: 'VCEL120HDEMO0008', model: 'L120H', hours: 10230 }, { serial: 'VCEEC210DEMO0009', model: 'EC210D', hours: 7810 }] },
  { name: 'PAVIMENTADORA AMOSTRA LTDA', branch: 'DEMO NORTE', city: 'Ananindeua', daysSince: 150, services: 7, machines: [
    { serial: 'VCESD110DEMO0010', model: 'SD110B', hours: 5320 }] },
  { name: 'LOGISTICA PORTO EXEMPLO LTDA', branch: 'DEMO NORTE', city: 'Barcarena', daysSince: 160, services: 11, machines: [
    { serial: 'VCEL150HDEMO0011', model: 'L150H', hours: 9020 }] },
  { name: 'CONSTRUCOES TESTE BELEM LTDA', branch: 'DEMO NORTE', city: 'Belem', daysSince: 240, services: 8, machines: [
    { serial: 'VCEEC140DEMO0012', model: 'EC140DL', hours: 6640 }, { serial: 'VCEL60HDEMO0013', model: 'L60H', hours: 5470 }] },
  { name: 'SANEAMENTO DEMO PARA S.A.', branch: 'DEMO NORTE', city: 'Marituba', daysSince: 300, services: 4, machines: [
    { serial: 'VCEEC200DEMO0014', model: 'EC200D', hours: 7110 }] },
  { name: 'FAZENDA MODELO PARAGOMINAS', branch: 'DEMO NORTE', city: 'Paragominas', daysSince: 420, services: 6, machines: [
    { serial: 'SDLGL958DEMO0015', model: 'L958F', hours: 8820 }, { serial: 'VCEG946DEMO0016', model: 'G946', hours: 7430 }] },
  { name: 'EXTRACAO MINERAL EXEMPLO LTDA', branch: 'DEMO NORTE', city: 'Paragominas', daysSince: 500, services: 3, machines: [
    { serial: 'VCEA40GDEMO0017', model: 'A40G', hours: 13980 }] },
  { name: 'COMERCIO DE AREIA FICTICIO LTDA', branch: 'DEMO NORTE', city: 'Castanhal', daysSince: 640, services: 2, machines: [
    { serial: 'VCEL90HDEMO0018', model: 'L90H', hours: 9810 }] },
  { name: 'PREFEITURA DEMO DE MOJU', branch: 'DEMO NORTE', city: 'Moju', daysSince: 720, services: 5, machines: [
    { serial: 'VCEG930DEMO0019', model: 'G930', hours: 11040 }] },
  // ---------- DEMO NORDESTE ----------
  { name: 'CONSTRUTORA EXEMPLO CEARA LTDA', branch: 'DEMO NORDESTE', city: 'Caucaia', daysSince: 25, services: 12, machines: [
    { serial: 'VCEEC220DEMO0020', model: 'EC220DL', hours: 7350 }, { serial: 'VCEL60HDEMO0021', model: 'L60H', hours: 160, delivered: 35 }] },
  { name: 'CIMENTOS MODELO NORDESTE S.A.', branch: 'DEMO NORDESTE', city: 'Caucaia', daysSince: 60, services: 18, machines: [
    { serial: 'VCEL150HDEMO0022', model: 'L150H', hours: 10610 }, { serial: 'VCEA30GDEMO0023', model: 'A30G', hours: 9930 }] },
  { name: 'ENERGIA EOLICA EXEMPLO LTDA', branch: 'DEMO NORDESTE', city: 'Itaitinga', daysSince: 80, services: 5, machines: [
    { serial: 'VCEEC300DEMO0024', model: 'EC300EL', hours: 4120 }] },
  { name: 'PEDREIRA AMOSTRA DO CEARA LTDA', branch: 'DEMO NORDESTE', city: 'Itaitinga', daysSince: 110, services: 9, machines: [
    { serial: 'VCEL120HDEMO0025', model: 'L120H', hours: 8910 }] },
  { name: 'INDUSTRIA FICTICIA DE MARACANAU', branch: 'DEMO NORDESTE', city: 'Maracanau', daysSince: 175, services: 6, machines: [
    { serial: 'SDLGL956DEMO0026', model: 'L956F', hours: 6230 }] },
  { name: 'TRANSPORTES TESTE SOBRAL LTDA', branch: 'DEMO NORDESTE', city: 'Sobral', daysSince: 210, services: 4, machines: [
    { serial: 'VCEL90HDEMO0027', model: 'L90H', hours: 7740 }, { serial: 'VCESD135DEMO0028', model: 'SD135B', hours: 5510 }] },
  { name: 'URBANIZADORA MODELO FORTALEZA', branch: 'DEMO NORDESTE', city: 'Fortaleza', daysSince: 330, services: 7, machines: [
    { serial: 'VCEEC140DEMO0029', model: 'EC140DL', hours: 8020 }] },
  { name: 'AGRO SERTAO EXEMPLO LTDA', branch: 'DEMO NORDESTE', city: 'Baturite', daysSince: 400, services: 3, machines: [
    { serial: 'VCEG946DEMO0030', model: 'G946', hours: 9150 }] },
  { name: 'CONSTRUTORA DEMO HORIZONTE LTDA', branch: 'DEMO NORDESTE', city: 'Horizonte', daysSince: 470, services: 5, machines: [
    { serial: 'VCEL60HDEMO0031', model: 'L60H', hours: 10390 }] },
  { name: 'LOCADORA FICTICIA DE MAQUINAS', branch: 'DEMO NORDESTE', city: 'Fortaleza', daysSince: 610, services: 10, machines: [
    { serial: 'VCEEC210DEMO0032', model: 'EC210D', hours: 12110 }, { serial: 'VCEL120HDEMO0033', model: 'L120H', hours: 11870 }] },
  { name: 'MINERADORA EXEMPLO SOBRAL S.A.', branch: 'DEMO NORDESTE', city: 'Sobral', daysSince: 800, services: 2, machines: [
    { serial: 'VCEA40GDEMO0034', model: 'A40G', hours: 14620 }] },
  { name: 'OBRAS PUBLICAS DEMO CAUCAIA', branch: 'DEMO NORDESTE', city: 'Caucaia', daysSince: 15, services: 3, machines: [
    { serial: 'VCEEC200DEMO0035', model: 'EC200D', hours: 150, delivered: 30 }] },
];

export const SERVICE_REASONS = ['Garantia', 'Férias', 'Aplicação de peças', 'Medição material rodante', 'Oficina', 'Manutenção carro', 'Diagnóstico', 'Entrega Técnica', 'Revisão PMP', 'Revisão OS cliente', 'Equipamento parado', 'Deslocamento garantia', 'Deslocamento cliente', 'Deslocamento PMP', 'Retorno à filial', 'Folga', 'Sem agenda', 'Treinamento', 'Visita 150h', 'Campanha de campo'];

const OPS = ['OS GARANTIA FABRICANTE', 'OS CLIENTE', 'OS REVISAO PMP', 'OS ENTREGA TECNICA', 'OS CAMPANHA DE CAMPO', 'OS DIAGNOSTICO'];
const DESCRIPTIONS = [
  'Revisão de 2.000 horas conforme plano de manutenção.',
  'Troca de mangueira do cilindro de levante com vazamento.',
  'Diagnóstico de falha intermitente no sistema elétrico.',
  'Substituição de filtros e análise de óleo do motor.',
  'Ajuste de folga nos pinos e buchas da caçamba.',
  'Atualização de software da unidade de controle.',
  'Inspeção do material rodante e medição de desgaste.',
  'Reparo no sistema de ar-condicionado da cabine.',
];

export const clientKey = (name: string, branch: string) => `${name.trim().toUpperCase()}|${branch.trim().toUpperCase()}`;
const cityKey = (city: string) => city.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
export const cityLabel = (city: string) => ({ Belem: 'Belém', Maracanau: 'Maracanaú', Baturite: 'Baturité' } as Record<string, string>)[city] || city;

export function buildSeed(): Tables {
  const t: Tables = {};
  const put = (name: string, row: Row) => { (t[name] ||= []).push(row); return row; };

  // Filiais, usuários e acessos
  put('app_branches', { name: 'DEMO NORTE', active: true, address: 'Rodovia Exemplo, 1000 - Ananindeua - PA, Brasil' });
  put('app_branches', { name: 'DEMO NORDESTE', active: true, address: 'Avenida Exemplo, 2000 - Fortaleza - CE, Brasil' });
  put('app_users', { matricula: '1001', name: 'Usuário Demo', role: 'admin', active: true });
  put('app_users', { matricula: '2001', name: 'Gestor Demo', role: 'gestor', active: true });
  put('app_users', { matricula: '3001', name: 'Consultor Demo Norte', role: 'consultor', active: true });
  put('app_users', { matricula: '3002', name: 'Consultor Demo Nordeste', role: 'consultor', active: true });
  put('app_user_branches', { matricula: '3001', branch: 'DEMO NORTE' });
  put('app_user_branches', { matricula: '3002', branch: 'DEMO NORDESTE' });
  // A demo começa com o tutorial já visto, para não interromper a apresentação
  for (const m of ['1001', '2001', '3001', '3002']) put('aria_user_state', { matricula: m, tutorial_completed_at: stamp(1), tutorial_skipped_at: null, updated_at: stamp(1) });

  // Técnicos
  const techs = [
    ['Técnico Ana', 'DEMO NORTE'], ['Técnico Bruno', 'DEMO NORTE'], ['Técnico Carlos', 'DEMO NORTE'],
    ['Técnico Diego', 'DEMO NORDESTE'], ['Técnico Elisa', 'DEMO NORDESTE'], ['Técnico Fábio', 'DEMO NORDESTE'],
  ].map(([name, branch], i) => put('technicians', { id: `tec-demo-${i + 1}`, name, branch, active: true, created_at: stamp(200) }));

  // Pessoas para compartilhar a agenda por e-mail (domínio de exemplo, não recebe nada)
  [['Coordenação Demo', 'coordenacao@exemplo.com.br'], ['Gerente Demo Norte', 'gerente.norte@exemplo.com.br'], ['Gerente Demo Nordeste', 'gerente.nordeste@exemplo.com.br'],
    ['Supervisor de Oficina Demo', 'oficina@exemplo.com.br'], ['Comercial Demo', 'comercial@exemplo.com.br'], ['Planejamento Demo', 'planejamento@exemplo.com.br']]
    .forEach(([name, email], i) => put('agenda_share_recipients', { id: `dest-${i + 1}`, name, email, active: true, sort_order: i + 1 }));
  put('agenda_share_user_defaults', { matricula: '1001', recipient_emails: ['coordenacao@exemplo.com.br', 'gerente.norte@exemplo.com.br'], updated_at: stamp(3) });

  // Campanhas
  put('service_campaigns', { code: 'CAMP-DEMO-01', description: 'Atualização de software do motor (exemplo)', active: true });
  put('service_campaigns', { code: 'CAMP-DEMO-02', description: 'Troca preventiva de mangueira hidráulica (exemplo)', active: true });
  put('service_campaigns', { code: 'CAMP-DEMO-03', description: 'Inspeção do sistema de freio (exemplo)', active: true });

  // Clientes, máquinas e histórico G4 fictício
  let sourceId = 1;
  for (const [ci, c] of CLIENTS.entries()) {
    const key = clientKey(c.name, c.branch);
    const city = cityLabel(c.city);
    const coords = CITY_COORDS[cityKey(c.city)];
    const firstAt = daysAgo(c.daysSince + 900 + ci * 11);
    const lastAt = daysAgo(c.daysSince);
    const serials = c.machines.map((m) => m.serial);
    const lastOp = OPS[ci % OPS.length];
    const lastDesc = DESCRIPTIONS[ci % DESCRIPTIONS.length];
    put('g4_client_summary', { client_key: key, client_name: c.name, branch: c.branch, city, last_service_at: lastAt, first_service_at: firstAt, service_count: c.services, machine_count: c.machines.length, last_operation_type: lastOp, last_description: lastDesc });
    put('g4_client_city_summary', { city_key: `${key}|${cityKey(c.city)}`, client_key: key, client_name: c.name, branch: c.branch, city, first_service_at: firstAt, last_service_at: lastAt, service_count: c.services, machine_count: c.machines.length, serials, last_operation_type: lastOp, last_description: lastDesc });
    put('g4_client_location_summary', { client_key: key, client_name: c.name, branch: c.branch, address: `Rua Exemplo, ${100 + ci * 7}`, neighborhood: 'Distrito Demo', city, state: coords?.state || null });
    put('g4_ordens_servico', { filial: c.branch, razao_social: c.name, nome_contato: `Contato ${ci + 1} (exemplo)`, email_contato: `contato${ci + 1}@cliente-exemplo.com.br`, telefones: `(00) 90000-${String(1000 + ci).padStart(4, '0')}`, data_abertura: lastAt });
    if (ci % 3 === 0) put('client_contacts', { client_key: key, branch: c.branch, client_name: c.name, phone: `(00) 90000-${String(1000 + ci).padStart(4, '0')}`, updated_at: stamp(20) });

    for (const [mi, m] of c.machines.entries()) {
      const count = Math.max(1, Math.round(c.services / c.machines.length));
      const machineLast = m.delivered ? daysAgo(m.delivered) : daysAgo(c.daysSince + mi * 9);
      const history: Row[] = [];
      for (let h = 0; h < Math.min(count, 6); h++) {
        const ago = m.delivered ? m.delivered : c.daysSince + mi * 9 + h * 75;
        const op = m.delivered && h === 0 ? 'OS ENTREGA TECNICA' : OPS[(ci + mi + h) % OPS.length];
        const row = {
          source_id: sourceId++, os_g4: `G4-DEMO-${String(sourceId).padStart(5, '0')}`, os_sap: 900000 + sourceId,
          client_name: c.name, serial: m.serial, city, branch: c.branch, operation_type: op, os_type: op.replace('OS ', ''),
          status: 'ENCERRADA', service_date: daysAgo(ago), description: m.delivered && h === 0 ? 'Entrega técnica da máquina nova ao cliente.' : DESCRIPTIONS[(ci + mi + h) % DESCRIPTIONS.length],
        };
        history.push(put('g4_history_app', row));
        if (m.delivered) break;
      }
      put('g4_machine_summary', {
        serial: m.serial, client_name: c.name, city, state: coords?.state || null, branch: c.branch,
        first_service_at: history[history.length - 1].service_date, last_service_at: machineLast, service_count: history.length,
        last_operation_type: history[0].operation_type, last_os_type: history[0].os_type, last_description: history[0].description,
        last_os_g4: history[0].os_g4, last_os_sap: history[0].os_sap,
      });
      put('hourmeter_readings', { id: uuid(), equipment_serial: m.serial, hourmeter: m.hours, reading_date: machineLast, appointment_id: null });

      // Visita 150h: máquinas com entrega técnica recente
      if (m.delivered) {
        put('inspection_150h', {
          pin: m.serial, branch: c.branch, client_name: c.name, city, service_city: city, brand: m.model.startsWith('L95') ? 'SDLG' : 'VOLVO', model: m.model,
          delivery_date: daysAgo(m.delivered), source_os_g4: history[0].os_g4, programmed_date: null, programmed_by_agenda: false,
          executed_date: null, executed_by_agenda: false, notes: null, appointment_id: null, updated_at: stamp(m.delivered),
        });
      }
    }
  }
  // Uma 150h já concluída, para mostrar os três status da tela
  put('inspection_150h', { pin: 'VCEL60HDEMO0099', branch: 'DEMO NORTE', client_name: 'CONSTRUTORA EXEMPLO NORTE LTDA', city: 'Benevides', service_city: 'Benevides', brand: 'VOLVO', model: 'L60H', delivery_date: daysAgo(75), source_os_g4: 'G4-DEMO-09999', programmed_date: daysAgo(30), programmed_by_agenda: false, executed_date: daysAgo(28), executed_by_agenda: false, notes: 'Inspeção feita sem pendências (exemplo).', appointment_id: null, updated_at: stamp(28) });

  // Máquinas em campanha (pendentes e uma executada)
  const campaigns: [string, string, string?][] = [
    ['CAMP-DEMO-01', 'VCEL60HDEMO0001'], ['CAMP-DEMO-01', 'VCEA30GDEMO0004'], ['CAMP-DEMO-01', 'VCEA30GDEMO0023'], ['CAMP-DEMO-01', 'VCEL120HDEMO0008', 'executada'],
    ['CAMP-DEMO-02', 'VCEC220DDEMO0002'], ['CAMP-DEMO-02', 'VCEEC220DEMO0020'], ['CAMP-DEMO-02', 'VCEL150HDEMO0011'],
    ['CAMP-DEMO-03', 'VCEEC480DEMO0006'], ['CAMP-DEMO-03', 'VCEL120HDEMO0025'], ['CAMP-DEMO-03', 'VCEL90HDEMO0027'],
  ];
  const machineBySerial = new Map((t.g4_machine_summary || []).map((m) => [m.serial, m]));
  const modelBySerial = new Map(CLIENTS.flatMap((c) => c.machines.map((m) => [m.serial, m.model] as const)));
  for (const [i, [code, serial, state]] of campaigns.entries()) {
    const m = machineBySerial.get(serial)!;
    put('campaign_machines', {
      id: `camp-maq-${i + 1}`, campaign_code: code, branch: m.branch, model: modelBySerial.get(serial) || 'L60H', serial_number: serial.slice(-4), pin: serial,
      recommendation: i % 4 === 0 ? 'Mandatory' : 'Recommended', repair_deadline: daysAhead(25 + i * 9), last_visit: m.last_service_at,
      opportunity_lost: i % 5 === 2, client_name: m.client_name, city: m.city, service_city: m.city,
      programmed_date: state ? daysAgo(40) : null, programmed_by_agenda: false, executed_date: state ? daysAgo(38) : null, executed_by_agenda: false,
      notes: state ? 'Campanha aplicada (exemplo).' : null, appointment_id: null, updated_at: stamp(10), description: null,
    });
  }

  // Agenda: semana atual e próxima
  const plan: [number, number, number, string, string | null, string | null, string][] = [
    // [semana, dia(0=seg), técnico, motivo, cliente, série, cidade]
    [0, 0, 0, 'Revisão PMP', 'MINERACAO DEMONSTRACAO S.A.', 'VCEA30GDEMO0005', 'Barcarena'],
    [0, 1, 0, 'Diagnóstico', 'MINERACAO DEMONSTRACAO S.A.', 'VCEEC480DEMO0006', 'Barcarena'],
    [0, 2, 0, 'Garantia', 'LOGISTICA PORTO EXEMPLO LTDA', 'VCEL150HDEMO0011', 'Barcarena'],
    [0, 3, 0, 'Retorno à filial', null, null, 'Ananindeua'],
    [0, 4, 0, 'Oficina', null, null, 'Ananindeua'],
    [0, 0, 1, 'Oficina', null, null, 'Ananindeua'],
    [0, 1, 1, 'Revisão OS cliente', 'CONSTRUTORA EXEMPLO NORTE LTDA', 'VCEC220DDEMO0002', 'Benevides'],
    [0, 3, 1, 'Aplicação de peças', 'AGROPECUARIA FICTICIA LTDA', 'SDLGL956DEMO0007', 'Castanhal'],
    [0, 4, 1, 'Visita 150h', 'TERRAPLANAGEM MODELO S.A.', 'VCEL90HDEMO0003', 'Benevides'],
    [0, 0, 2, 'Treinamento', null, null, 'Ananindeua'],
    [0, 1, 2, 'Entrega Técnica', 'PAVIMENTADORA AMOSTRA LTDA', 'VCESD110DEMO0010', 'Ananindeua'],
    [0, 2, 2, 'Medição material rodante', 'MADEIREIRA EXEMPLO DO PARA LTDA', 'VCEEC210DEMO0009', 'Moju'],
    [0, 3, 2, 'Férias', null, null, ''], [0, 4, 2, 'Férias', null, null, ''],
    [0, 0, 3, 'Revisão PMP', 'CIMENTOS MODELO NORDESTE S.A.', 'VCEL150HDEMO0022', 'Caucaia'],
    [0, 1, 3, 'Garantia', 'ENERGIA EOLICA EXEMPLO LTDA', 'VCEEC300DEMO0024', 'Itaitinga'],
    [0, 3, 3, 'Diagnóstico', 'TRANSPORTES TESTE SOBRAL LTDA', 'VCESD135DEMO0028', 'Sobral'],
    [0, 0, 4, 'Oficina', null, null, 'Fortaleza'], [0, 1, 4, 'Oficina', null, null, 'Fortaleza'],
    [0, 2, 4, 'Revisão OS cliente', 'URBANIZADORA MODELO FORTALEZA', 'VCEEC140DEMO0029', 'Fortaleza'],
    [0, 4, 4, 'Aplicação de peças', 'INDUSTRIA FICTICIA DE MARACANAU', 'SDLGL956DEMO0026', 'Maracanaú'],
    [0, 1, 5, 'Deslocamento cliente', null, null, 'Baturité'],
    [0, 2, 5, 'Revisão PMP', 'AGRO SERTAO EXEMPLO LTDA', 'VCEG946DEMO0030', 'Baturité'],
    [0, 4, 5, 'Folga', null, null, ''],
    [1, 0, 0, 'Revisão PMP', 'SANEAMENTO DEMO PARA S.A.', 'VCEEC200DEMO0014', 'Marituba'],
    [1, 2, 1, 'Garantia', 'CONSTRUCOES TESTE BELEM LTDA', 'VCEEC140DEMO0012', 'Belém'],
    [1, 1, 3, 'Revisão PMP', 'PEDREIRA AMOSTRA DO CEARA LTDA', 'VCEL120HDEMO0025', 'Itaitinga'],
    [1, 3, 4, 'Diagnóstico', 'LOCADORA FICTICIA DE MAQUINAS', 'VCEEC210DEMO0032', 'Fortaleza'],
  ];
  for (const [i, [week, day, tech, reason, client, serial, city]] of plan.entries()) {
    const date = weekDay(week, day);
    const past = new Date(`${date}T12:00:00`).getTime() < Date.now() - DAY / 2;
    put('appointments', {
      id: `atd-demo-${i + 1}`, branch: techs[tech].branch, appointment_date: date, technician_id: techs[tech].id,
      client_name: client, equipment_serial: serial, service_city: city || null,
      status: past ? 'concluido' : 'planejado', service_reason: reason,
      description: client ? DESCRIPTIONS[i % DESCRIPTIONS.length] : null, reported_hourmeter: null,
      forecast_amount: 0, billing_status: client && past ? 'pendente' : '-', created_at: stamp(10 - i / 10),
    });
  }

  // Follow-ups em andamento
  const followups: [string, string, number, string, string][] = [
    ['CONSTRUCOES TESTE BELEM LTDA', 'DEMO NORTE', 6, 'prospectar', 'Cliente sem visita há 8 meses. Ligar para oferecer revisão.'],
    ['FAZENDA MODELO PARAGOMINAS', 'DEMO NORTE', 3, 'acompanhar', 'Enviada proposta de material rodante (exemplo).'],
    ['URBANIZADORA MODELO FORTALEZA', 'DEMO NORDESTE', 2, 'acompanhar', 'Aguardando aprovação do orçamento de peças.'],
    ['AGRO SERTAO EXEMPLO LTDA', 'DEMO NORDESTE', 9, 'prospectar', 'Sugestão da ArIA: cliente inativo na rota de Baturité.'],
    ['LOCADORA FICTICIA DE MAQUINAS', 'DEMO NORDESTE', 20, 'encerrar', 'Venda de serviços fechada (exemplo).'],
  ];
  for (const [i, [client, branch, ago, stage, notes]] of followups.entries()) {
    put('followups', {
      id: `fup-demo-${i + 1}`, branch, client_name: client, equipment_serial: null, action_date: daysAgo(ago), treatment_type: 'retorno',
      status: stage === 'encerrar' ? 'convertido' : 'contato_realizado', estimated_value: null,
      next_followup_date: stage === 'encerrar' ? null : daysAhead(i % 2 ? 2 : -1), notes, stage,
      result: stage === 'encerrar' ? 'venda_ganha' : null, sale_kind: stage === 'encerrar' ? 'servicos' : null,
      parts_value: null, services_value: null, lost_reason: null,
      created_by_matricula: '1001', created_by_name: 'Usuário Demo', updated_by_matricula: '1001', updated_by_name: 'Usuário Demo',
      created_at: stamp(ago), updated_at: stamp(Math.max(0, ago - 1)),
    });
  }

  for (const name of ['ai_insights', 'agenda_route_metrics', 'followup_updates', 'aria_learning', 'aria_intent_memory', 'aria_aliases', 'client_location_overrides', 'client_address_enrichment', 'aria_campaign_targets', 'map_location_cache']) t[name] ||= [];
  return t;
}

export const demoDates = { isoDay, monday, daysAgo, daysAhead };
