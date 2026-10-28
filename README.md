# Agenda Técnica · MODO DEMO

Versão de demonstração da Agenda Técnica, separada do sistema oficial.

- **Não conecta a nenhum banco de dados.** Todos os dados são fictícios e ficam no navegador de quem abre a demo.
- **Nada aqui afeta a operação real.** O botão "Compartilhar" só prepara o rascunho no Outlook, com endereços de exemplo (`@exemplo.com.br`).
- **Reiniciar demo** (faixa amarela no topo) volta tudo ao original e recalcula as datas a partir de hoje.

## Perfis de exemplo

| Matrícula | Perfil |
|---|---|
| 1001 | Admin (todas as filiais) |
| 2001 | Gestor |
| 3001 | Consultor · DEMO NORTE |
| 3002 | Consultor · DEMO NORDESTE |

## O que vem cadastrado

- 2 filiais (DEMO NORTE, DEMO NORDESTE) e 6 técnicos de exemplo.
- 25 clientes fictícios com máquinas, histórico de atendimentos e clientes inativos nas 5 faixas de tempo sem atendimento (até 3 meses, 3–6, 6–12, 12–18 e +18 meses).
- 3 campanhas de exemplo (CAMP-DEMO-01, 02 e 03) em 10 máquinas, além de máquinas com Visita 150h pendente.
- Agenda da semana atual e da próxima, follow-ups em andamento e 6 contatos para compartilhar a agenda.
- Todos os tipos de atendimento da legenda oficial.

## Insights que funcionam na demo

Ao informar a série ou a cidade em um atendimento, a ArIA mostra:

1. Campanha pendente na própria máquina.
2. Visita 150h pendente na própria máquina.
3. Campanhas pendentes de outras máquinas na mesma cidade.
4. Visita 150h pendente de outras máquinas na mesma cidade.
5. Nenhum insight quando não há pendência (exemplo: Castanhal).

Ao salvar, os insights entram no sininho. Agendar "Visita 150h" ou "Campanha de campo" preenche a data de programação, e concluir o atendimento preenche a data de execução.

## Rodar e publicar

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera a pasta dist/
```

No Vercel: importe este repositório como um projeto novo (framework **Vite**, saída `dist`). Não precisa de variáveis de ambiente.
