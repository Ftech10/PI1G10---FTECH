# Verificação da versão 6.0

Ambiente: Node.js 24, MariaDB 11.8 e Chromium. Os bancos foram criados exclusivamente para verificação. O banco do usuário não foi acessado. MySQL 8 é alvo de compatibilidade do SQL; a execução desta entrega usa MariaDB.

## Executar

```sh
npm test
npm run format:check
npm run test:integration
npm audit --omit=dev
```

A integração usa `DB_HOST`, `DB_PORT`, `DB_USER` e `DB_PASSWORD`. Ela cria e remove bancos com prefixo `ftech_test_`, sem alterar o banco indicado por `DB_NAME`. Exige permissões para esses bancos temporários.

## Cobertura

- Validação de campos, URLs, senha e limite UTF-8, dias únicos e carga decimal.
- Preços e cupom calculados em centavos no servidor.
- Login e autorização dos três perfis, JSON inválido, erros 404 e cabeçalhos.
- Porta ocupada tratada na inicialização.
- Conclusões simultâneas sem duplicação, registro em dias diferentes e desmarcação apenas do dia atual.
- Agenda de hoje, dias diferentes e treinos antigos sem agenda.
- Descanso e orientação retornados pela API; carga preservada em repetição do registro.
- Pedido pendente bloqueando a API; preço enviado pelo cliente ignorado; cupom inválido recusado.
- Pagamento de pedido de outro usuário recusado; método inválido recusado.
- Confirmação repetida não duplica o período; assinatura expirada bloqueia acesso e nova confirmação libera.
- Primeiros passos para conta paga sem professor/plano; objetivo salvo no perfil.
- Edição e remoção de exercício preservando histórico.
- Vínculo inválido não remove o anterior; professor desvinculado perde acesso.
- Desativação e troca de senha invalidam tokens.
- Seed repetido não redefine senha.
- Migração do esquema antigo executada duas vezes, mantendo registros e o acesso das contas anteriores.
- Falha assíncrona de banco retorna JSON 500 sem encerrar o serviço. A mensagem TEST_DB_FAILURE no teste é intencional.

## Navegador

Prepare um banco novo exclusivo, execute `npm run db` e `npm run seed:presentation`, ajuste o nome do aluno de demonstração para `Lucas D'Ávila` pelo perfil e inicie a aplicação usando esse banco. O nome com apóstrofo é usado para verificar o problema corrigido da versão original.

Instale o Chromium do Playwright:

```sh
npx playwright install chromium
```

Em outro terminal, no PowerShell:

```powershell
$env:DEMO_PASSWORD="SENHA_DO_SEU_AMBIENTE_DE_TESTE"
$env:TEST_BASE_URL="http://127.0.0.1:3000"
npm run test:browser
```

`CHROMIUM_PATH` pode apontar para um Chromium já instalado. Os testes criam contas e alteram dados; não os execute no banco real. Sem DEMO_PASSWORD, os testes dos perfis preparados são ignorados, mas o cadastro/checkout ainda cria contas no servidor indicado.

Os cenários cobrem a página pública, preços, modais, imagens, painéis em celular, navegação dos perfis, criação/edição/arquivamento, campos da prescrição, cronômetro, carga, histórico, erros de API, respostas atrasadas, cadastro com confirmação de senha, Pix e cartão fictícios, cupom, bloqueio antes de pagar, recarga da página e retomada do checkout.

As verificações reduzem o risco de regressão, mas não garantem ausência de defeitos em todos os ambientes.

## Resultado da entrega

- Instalação limpa com o lockfile concluída.
- 10 testes unitários aprovados.
- 14 cenários de integração com banco real aprovados (15 resultados contando o teste agrupador).
- 16 cenários de navegador, incluindo cadastro e pagamento em 390 e 1440 pixels.
- Formatação verificada.
- Auditoria das dependências de produção: nenhuma vulnerabilidade reportada nesta execução.

Durante a revisão foram corrigidos o carregamento público dos preços e a quebra de nomes/e-mails longos na tabela do administrador em celular. As capturas em `screenshots` mostram o produto em funcionamento com dados fictícios.
