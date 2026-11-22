# Meu Treino PRO 5.0 — Pacote de demonstração e base beta para SaaS

**Pacote evolutivo sobre a versão V4 original, mantendo os perfis e backups existentes.** O produto local está apto para uma **demonstração funcional**; a área de contas na nuvem é apenas um beta técnico configurável, **não homologado para clientes pagantes**.

## Como abrir

| Arquivo | Finalidade |
|---|---|
| `landing.html` | Página de apresentação com recursos, dúvidas e planos futuros |
| `demo.html` | Demonstração completa com **dados fictícios** e armazenamento isolado |
| `index.html` | Aplicação principal local para Maurício e Nathy; mantém dados salvos no navegador |
| `cloud/index.html` | Beta de autenticação Supabase e registros individuais (necessita configuração) |

Para executar em ambiente local, extraia o ZIP e rode o servidor estático na pasta raiz:

```bash
python -m http.server 8000
```

Abra `http://localhost:8000/landing.html`. O PWA e o acesso offline exigem um contexto seguro (localhost ou HTTPS), e o suporte de cache varia conforme o navegador.

## Publicação no GitHub Pages

1. **Antes de atualizar a versão V4**, abra o app anterior no aparelho em que seus registros existem e use **Exportar backup (.json)** em Ajustes. Salve o arquivo em Arquivos/iCloud Drive.
2. Extraia este ZIP. Envie todos os arquivos e pastas para a raiz do repositório do GitHub onde V4 já está publicado. **Não envie somente o ZIP**.
3. Faça o commit. Em **Settings → Pages**, configure a publicação pelo branch principal / raiz, conforme a configuração atual de seu repositório.
4. Em **Actions**, observe o workflow de publicação do Pages. O deploy finalizado aparece como sucesso; o link para o site fica em Settings → Pages.
5. Abra `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/landing.html` para a apresentação e `/index.html` para a V5 local. O histórico do aparelho permanece apenas se a origem/URL e o armazenamento do navegador forem mantidos.
6. No iPhone, abra o site no Safari e use **Compartilhar → Adicionar à Tela de Início**. Teste após a atualização. Acessar por outra URL/domínio pode criar um armazenamento independente.

> **Atenção:** salvar uma nova versão no GitHub não importa nem recupera os registros do iPhone. Eles dependem do armazenamento local do navegador, que pode ser removido ao limpar dados. Sempre mantenha cópia do backup.

## O que foi feito

- Design mobile-first premium, tema escuro/claro e barra lateral responsiva em desktop.
- Navegação com 5 destinos principais e 6 atalhos secundários.
- Nova ficha padrão da Nathy com cinco exercícios e cardio em cada um dos cinco dias (migração somente para dias padrão antigos que não haviam sido modificados).
- Registro detalhado por série, cargas, repetições, duração da sessão e histórico de volume.
- Medidas adicionais, registro de sono e metas semanais.
- Contador de calorias e proteínas e edição manual de registros com carboidratos e gorduras.
- Biblioteca pesquisável de 183 exercícios, com orientações básicas e desenhos esquemáticos por grupo muscular.
- PWA com precache atualizado, página pública de apresentação e modo demo segregado dos perfis pessoais.
- Esqueleto de infraestrutura Supabase com políticas RLS, interface beta de contas, registros e exclusão via função de servidor.

## Arquitetura

**Aplicativo principal:** HTML/CSS/JS sem build. Dados via `localStorage` (chave `meu-treino-profiles-v2`, com objeto `v5` dentro de cada perfil). Service worker `sw.js` faz cache de recursos estáticos; as páginas/JS/CSS usam estratégia online-first para facilitar atualizações.

**Demonstração:** `demo.html` + `demo-app.js`, armazenamento distinto, com histórico e medidas inventados apenas para exibir recursos.

**Beta cloud:** cliente Supabase JS v2, PostgreSQL com RLS e Deno Edge Function, todos em `cloud/`. A área cloud registra dados próprios e importa uma cópia de **um** perfil de backup, mas ainda não sincroniza automaticamente com a aplicação local da raiz. Sem chaves e banco configurados, o cadastro fica desabilitado.

## Dados, privacidade e limitações

- O backup JSON V2/V5 inclui os dois perfis locais e não tem criptografia. Trate-o como sensível.
- O nome interno da Nathy permanece `natht` para preservar dados anteriores, mas o nome visual é Nathy.
- A versão local não oferece autenticação real, isolamento por conta, sincronização nem fotos corporais.
- O beta cloud não foi conectado ou testado contra um backend real neste ambiente. Consulte `cloud/README.md` antes de preenchê-lo.
- Treinos e informações de nutrição não representam recomendações médicas ou dietas personalizadas profissionais. A biblioteca usa ilustrações de **grupos musculares**, não imagens de execução do movimento específico. Não possui fontes de alimentos oficialmente verificadas.
- Checkout, cobrança, assinaturas ativas, área admin, hospedagem de fotos e sincronização local-cloud permanecem pendentes.

## Testes e documentação

- `python tests/smoke.py`: smoke tests em Chromium/Playwright, usando conteúdo estático injetado por restrição de navegação do ambiente de teste.
- `python tests/visual_check.py`: capturas de tela de inspeção visual em Chromium.
- `docs/AUDITORIA_E_ROADMAP.md`: diagnóstico, comparação V4–V5, pendências e roteiro de apresentação comercial de 5 minutos.
- `docs/TESTES.md`: checklist de homologação, com testes multiusuário obrigatórios antes de lançamento comercial.
- `cloud/README.md`: passos técnicos de configuração e limites da arquitetura beta.

## Próximos passos antes da comercialização

Configurar infraestrutura cloud, integrar UI principal às contas com migração segura e sincronização, executar testes de isolamento RLS e recuperação de conta, implementar cobrança backend com webhooks e idempotência, revisar LGPD e termos com profissional, validar em iPhone/Android reais e testar rotinas de backup/restauração. Não anuncie funcionalidades ainda não verificadas.
