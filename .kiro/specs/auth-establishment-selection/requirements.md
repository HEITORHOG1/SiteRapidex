# Requirements Document

## Introduction

Esta funcionalidade implementa um frontend Angular moderno e elegante para autenticação JWT com seleção de estabelecimentos para proprietários. O sistema consome APIs REST existentes para autenticação e gerenciamento de estabelecimentos. Após o login bem-sucedido, o usuário é direcionado para um dashboard responsivo onde pode visualizar e selecionar entre os estabelecimentos cadastrados. O frontend deve manter o estado da autenticação, gerenciar tokens automaticamente e fornecer uma experiência de usuário fluida e moderna.

## Requirements

### Requirement 1

**User Story:** Como proprietário, eu quero fazer login no sistema usando minhas credenciais através de uma interface moderna e intuitiva, para que eu possa acessar minha área administrativa de forma segura.

#### Acceptance Criteria

1. WHEN o usuário submete credenciais válidas THEN o frontend SHALL fazer uma requisição POST para `http://localhost:5283/api/Auth/login`
2. WHEN a autenticação é bem-sucedida THEN o frontend SHALL armazenar o token JWT, refresh token e dados do usuário no localStorage
3. WHEN a autenticação falha THEN o frontend SHALL exibir uma mensagem de erro clara com design elegante
4. WHEN o usuário está autenticado THEN o frontend SHALL redirecionar automaticamente para o dashboard
5. WHEN há carregamento THEN o frontend SHALL exibir um indicador de loading moderno

### Requirement 2

**User Story:** Como usuário autenticado, eu quero que meus tokens sejam renovados automaticamente através de interceptors Angular, para que eu não precise fazer login repetidamente durante o uso normal do sistema.

#### Acceptance Criteria

1. WHEN o token JWT está próximo do vencimento THEN o frontend SHALL automaticamente fazer uma requisição POST para `http://localhost:5283/api/Auth/refresh-token`
2. WHEN o refresh token é válido THEN o frontend SHALL atualizar o token JWT e refresh token no localStorage
3. WHEN o refresh token é inválido THEN o frontend SHALL redirecionar o usuário para a tela de login com transição suave
4. WHEN há erro na renovação THEN o frontend SHALL fazer logout automático e redirecionar para login
5. WHEN há renovação de token THEN o processo SHALL ser transparente ao usuário

### Requirement 3

**User Story:** Como proprietário autenticado, eu quero visualizar todos os meus estabelecimentos cadastrados em um dashboard moderno e responsivo, para que eu possa ter uma visão geral elegante dos meus negócios.

#### Acceptance Criteria

1. WHEN o usuário acessa o dashboard THEN o frontend SHALL fazer uma requisição GET para `http://localhost:5283/api/Estabelecimento/proprietario/{userId}` com Authorization Bearer
2. WHEN a requisição é bem-sucedida THEN o frontend SHALL exibir uma grid/lista elegante dos estabelecimentos com cards modernos mostrando (nome fantasia, razão social, endereço, status)
3. WHEN não há estabelecimentos cadastrados THEN o frontend SHALL exibir uma mensagem informativa com design atrativo e opção de cadastrar novo estabelecimento
4. WHEN há erro na requisição THEN o frontend SHALL exibir mensagem de erro com design consistente e opção de tentar novamente
5. WHEN há carregamento THEN o frontend SHALL exibir skeleton loading ou spinner elegante

### Requirement 4

**User Story:** Como proprietário, eu quero selecionar um estabelecimento específico no dashboard através de uma interface intuitiva, para que eu possa gerenciar as operações daquele estabelecimento específico.

#### Acceptance Criteria

1. WHEN o usuário clica em um card de estabelecimento THEN o frontend SHALL destacar visualmente o estabelecimento selecionado com animações suaves
2. WHEN um estabelecimento é selecionado THEN o frontend SHALL armazenar o ID e dados do estabelecimento selecionado no estado da aplicação (service)
3. WHEN um estabelecimento é selecionado THEN o frontend SHALL exibir informações detalhadas do estabelecimento em um painel lateral ou modal elegante
4. WHEN o usuário confirma a seleção THEN o frontend SHALL navegar para a área de gerenciamento do estabelecimento com transição suave
5. WHEN há seleção ativa THEN o frontend SHALL mostrar claramente qual estabelecimento está selecionado

### Requirement 5

**User Story:** Como usuário do sistema, eu quero que a interface seja responsiva, moderna e elegante seguindo as melhores práticas de UX/UI, para que eu tenha uma experiência excepcional em qualquer dispositivo.

#### Acceptance Criteria

1. WHEN a aplicação é acessada em dispositivos móveis THEN o layout SHALL se adaptar adequadamente usando CSS Grid/Flexbox e breakpoints responsivos
2. WHEN há transições entre telas THEN o frontend SHALL exibir animações suaves e indicadores de carregamento modernos
3. WHEN há interações do usuário THEN o frontend SHALL fornecer feedback visual imediato (hover effects, ripple effects, etc.)
4. WHEN há estados de erro THEN o frontend SHALL exibir mensagens claras com design consistente e ações possíveis
5. WHEN há formulários THEN o frontend SHALL implementar validação em tempo real com feedback visual elegante

### Requirement 6

**User Story:** Como desenvolvedor, eu quero que o código frontend siga boas práticas de arquitetura Angular e clean code, para que o sistema seja maintível, escalável e siga padrões modernos.

#### Acceptance Criteria

1. WHEN implementando serviços THEN o código SHALL seguir o padrão de injeção de dependência do Angular com separação clara de responsabilidades
2. WHEN gerenciando estado THEN o frontend SHALL usar serviços dedicados para autenticação e seleção de estabelecimento com RxJS observables
3. WHEN fazendo requisições HTTP THEN o frontend SHALL usar interceptors para adicionar tokens automaticamente e tratar erros globalmente
4. WHEN implementando guards THEN o frontend SHALL proteger rotas que requerem autenticação e redirecionar adequadamente
5. WHEN estruturando componentes THEN o código SHALL seguir a arquitetura de componentes smart/dumb com comunicação via @Input/@Output
6. WHEN implementando estilos THEN o frontend SHALL usar SCSS com variáveis, mixins e seguir metodologia BEM ou similar