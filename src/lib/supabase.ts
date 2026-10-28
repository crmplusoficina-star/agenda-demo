// MODO DEMO: este app NÃO se conecta a nenhum banco de dados.
// O cliente abaixo imita a interface do Supabase sobre dados fictícios guardados no navegador.
import { demoClient } from './demo/backend';

export const supabase: any = demoClient;

export async function registerAgendaRouteSource() {
  return supabase.functions.invoke('agenda-route-worker', { body: { mode: 'register_source' } });
}
