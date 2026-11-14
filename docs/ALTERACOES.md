# Alterações da versão 6.0

## Experiência do produto

- Página pública explica o problema, os papéis e as funcionalidades realmente disponíveis.
- Agenda semanal com filtro por dia, treino de hoje e identificação dos dias livres.
- Percentual baseado somente nos exercícios agendados para hoje; execuções extras vão para o histórico.
- Orientação após o cadastro: objetivo, vínculo com professor e recebimento do plano.
- Professor vê alunos sem plano; administrador vê alunos sem vínculo.
- Objetivo do aluno disponível no perfil e para seu professor.
- Exercícios com descanso e observações, cronômetro e registro opcional de carga em kg.
- Histórico de cargas separado da frequência de atividades; sem promessa de resultado físico.
- Personagens ilustrativos gerados por IA mantidos nas telas.

## Cadastro, planos e parceria

- Cadastro com confirmação de senha, regras visíveis, limite UTF-8 e exibição/ocultação.
- Login com mensagens na própria tela e retomada da etapa pendente.
- Plano mensal de R$ 29,90 e anual de R$ 299,00.
- Cupom fictício PARCERIA10: 10% sobre o valor selecionado; totais R$ 26,91 e R$ 269,10.
- Área pública para apresentar a ideia de futuras parcerias, sem sugerir acordo comercial real.
- Checkout com resumo de valores e Pix/cartão exclusivamente de demonstração, sem dados financeiros.
- Pedidos vinculados à conta; confirmação idempotente e liberação de acesso verificada pela API.
- Pedidos pendentes ou assinaturas expiradas não permitem acessar treinos, progresso e painéis.
- Aba Assinatura mostra período válido e histórico das simulações. Sem renovação automática.
- Contas anteriores à migração conservam o acesso; administradores não precisam de assinatura.

## Apresentação e atualização

- Migração repetível adiciona os campos novos, sem inventar dias para treinos antigos e sem apagar dados.
- Seed completo para banco de apresentação novo, com três planos de treino, perfis preenchidos, assinaturas fictícias e 21 dias de registros.
- Seeds não sobrescrevem contas ou planos existentes.
- Roteiro APRESENTAR.md orienta a demonstração do produto sem discutir o código.
- Capturas atualizadas e testes para agenda, carga, pagamento, cupom e cadastro em celular.

As proteções da versão 5.2 foram mantidas: bcrypt, JWT com versão de sessão, bloqueio de contas desativadas, permissões por vínculo, transações, consultas parametrizadas, validação, CSP e tratamento de erros.
