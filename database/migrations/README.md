# Atualização do banco

A migração mantida desta versão está em `scripts/migrate.js`. Pare a aplicação, faça backup e execute `npm run migrate` na raiz do projeto com o `.env` configurado. O comando detecta os campos e índices existentes e pode ser repetido.

Não execute a estrutura legada em `tests/fixtures`: ela existe apenas para os testes de migração em banco isolado.
