# Requirements Document - Limpeza e Otimização do Projeto Angular

## Introduction

Este documento define os requisitos para limpar e otimizar o projeto Angular Rapidex, removendo código desnecessário, corrigindo warnings de SCSS deprecados, removendo dependências não utilizadas e garantindo que o projeto funcione de forma simples, leve e sempre online. O foco é eliminar funcionalidades offline, simplificar a arquitetura e corrigir todos os problemas identificados nos logs de build.

## Requirements

### Requirement 1

**User Story:** Como desenvolvedor, eu quero corrigir todos os warnings de SCSS deprecados, para que o projeto compile sem avisos e use as funções modernas do Sass.

#### Acceptance Criteria

1. WHEN o projeto é compilado THEN o sistema SHALL substituir todas as funções `darken()` por `color.adjust()` ou `color.scale()`
2. WHEN o projeto é compilado THEN o sistema SHALL substituir todas as funções `lighten()` por `color.adjust()` ou `color.scale()`
3. WHEN arquivos SCSS são processados THEN o sistema SHALL substituir `@import` por `@use` seguindo as práticas modernas do Sass
4. WHEN o build é executado THEN o sistema SHALL não exibir warnings relacionados a funções de cor deprecadas
5. WHEN estilos são aplicados THEN o sistema SHALL manter a aparência visual idêntica após as correções

### Requirement 2

**User Story:** Como desenvolvedor, eu quero remover componentes e diretivas não utilizadas, para que o bundle seja menor e o código mais limpo.

#### Acceptance Criteria

1. WHEN componentes são analisados THEN o sistema SHALL remover `AriaAnnounceDirective` não utilizada dos imports
2. WHEN componentes são analisados THEN o sistema SHALL remover `FocusTrapDirective` não utilizada dos imports
3. WHEN componentes são analisados THEN o sistema SHALL remover `KeyboardNavigationDirective` não utilizada dos imports
4. WHEN componentes são analisados THEN o sistema SHALL remover `AriaDescribedByDirective` não utilizada dos imports
5. WHEN componentes são analisados THEN o sistema SHALL remover `HighContrastDirective` não utilizada dos imports
6. WHEN componentes são analisados THEN o sistema SHALL remover `CategoryVirtualScrollComponent` não utilizada dos imports

### Requirement 3

**User Story:** Como desenvolvedor, eu quero remover todas as funcionalidades offline e de cache, para que o projeto seja sempre online e mais simples.

#### Acceptance Criteria

1. WHEN o projeto é analisado THEN o sistema SHALL remover todo código relacionado a cache offline
2. WHEN o projeto é analisado THEN o sistema SHALL remover service workers se existirem
3. WHEN o projeto é analisado THEN o sistema SHALL remover funcionalidades de sincronização offline
4. WHEN requisições HTTP são feitas THEN o sistema SHALL sempre consultar a API sem cache local
5. WHEN há perda de conectividade THEN o sistema SHALL exibir mensagem de erro ao invés de funcionar offline

### Requirement 4

**User Story:** Como desenvolvedor, eu quero remover dependências desnecessárias do package.json, para que o projeto tenha apenas o essencial.

#### Acceptance Criteria

1. WHEN dependências são analisadas THEN o sistema SHALL remover bibliotecas não utilizadas no código
2. WHEN dependências são analisadas THEN o sistema SHALL manter apenas Angular core, Material, RxJS e Chart.js
3. WHEN scripts são analisados THEN o sistema SHALL remover scripts de teste e2e se não utilizados
4. WHEN scripts são analisados THEN o sistema SHALL simplificar scripts de build e desenvolvimento
5. WHEN o projeto é instalado THEN o sistema SHALL ter um node_modules menor e mais rápido

### Requirement 5

**User Story:** Como desenvolvedor, eu quero simplificar o monitoramento de performance no main.ts, para que seja mais leve e focado apenas no essencial.

#### Acceptance Criteria

1. WHEN a aplicação inicia THEN o sistema SHALL remover monitoramento complexo de memória
2. WHEN a aplicação inicia THEN o sistema SHALL manter apenas logs básicos de performance
3. WHEN a aplicação inicia THEN o sistema SHALL remover intervalos de monitoramento contínuo
4. WHEN a aplicação inicia THEN o sistema SHALL ter um bootstrap mais rápido e simples
5. WHEN há problemas de performance THEN o sistema SHALL usar ferramentas de dev do browser ao invés de código customizado

### Requirement 6

**User Story:** Como desenvolvedor, eu quero otimizar a estrutura de arquivos e remover código morto, para que o projeto seja mais maintível.

#### Acceptance Criteria

1. WHEN arquivos são analisados THEN o sistema SHALL remover arquivos não referenciados
2. WHEN componentes são analisados THEN o sistema SHALL remover métodos e propriedades não utilizadas
3. WHEN serviços são analisados THEN o sistema SHALL remover injeções de dependência desnecessárias
4. WHEN imports são analisados THEN o sistema SHALL remover imports não utilizados
5. WHEN a estrutura é analisada THEN o sistema SHALL manter apenas arquivos essenciais para funcionalidade

### Requirement 7

**User Story:** Como desenvolvedor, eu quero configurar o projeto para ser sempre online, para que não haja complexidade desnecessária de gerenciamento de estado offline.

#### Acceptance Criteria

1. WHEN interceptors são configurados THEN o sistema SHALL remover lógica de retry offline
2. WHEN serviços são configurados THEN o sistema SHALL sempre fazer requisições HTTP diretas
3. WHEN há erro de rede THEN o sistema SHALL exibir mensagem clara ao usuário
4. WHEN dados são carregados THEN o sistema SHALL sempre buscar da API sem fallback local
5. WHEN o usuário perde conexão THEN o sistema SHALL desabilitar funcionalidades ao invés de usar cache

### Requirement 8

**User Story:** Como desenvolvedor, eu quero adaptar todas as chamadas da API para o novo formato de resposta padronizado, para que o frontend funcione corretamente com o backend atualizado.

#### Acceptance Criteria

1. WHEN a API retorna dados THEN o sistema SHALL extrair os dados do campo `data` do wrapper de resposta
2. WHEN há sucesso na API THEN o sistema SHALL verificar o campo `success: true` antes de processar
3. WHEN há erro na API THEN o sistema SHALL usar o campo `errors` array para exibir mensagens de erro
4. WHEN há mensagem da API THEN o sistema SHALL usar o campo `message` para feedback ao usuário
5. WHEN requisições são feitas THEN o sistema SHALL usar `http://localhost:5283` como base URL
6. WHEN respostas são processadas THEN o sistema SHALL ter tratamento consistente do novo formato em todos os serviços

### Requirement 9

**User Story:** Como desenvolvedor, eu quero simplificar os interceptors HTTP, para que tenham apenas a funcionalidade essencial.

#### Acceptance Criteria

1. WHEN interceptors são analisados THEN o sistema SHALL manter apenas auth-token e error interceptors essenciais
2. WHEN interceptors são analisados THEN o sistema SHALL remover lógica complexa de retry e cache
3. WHEN interceptors são analisados THEN o sistema SHALL ter código simples e direto
4. WHEN requisições passam pelos interceptors THEN o sistema SHALL adicionar apenas token e tratar erros básicos
5. WHEN há erro HTTP THEN o sistema SHALL ter tratamento simples e consistente

### Requirement 10

**User Story:** Como desenvolvedor, eu quero criar modelos TypeScript para o novo formato de resposta da API, para que haja type safety e consistência.

#### Acceptance Criteria

1. WHEN modelos são definidos THEN o sistema SHALL ter interface `ApiResponse<T>` com campos success, message, data, errors, timestamp
2. WHEN respostas são tipadas THEN o sistema SHALL usar generics para tipar o campo `data`
3. WHEN erros são tratados THEN o sistema SHALL ter interface `ApiError` para o array de erros
4. WHEN interceptors são usados THEN o sistema SHALL transformar automaticamente as respostas
5. WHEN serviços fazem chamadas THEN o sistema SHALL retornar apenas os dados do campo `data` após validação

### Requirement 11

**User Story:** Como desenvolvedor, eu quero otimizar o bundle size e performance, para que o projeto carregue rapidamente.

#### Acceptance Criteria

1. WHEN o projeto é buildado THEN o sistema SHALL ter bundle size menor que 500KB inicial
2. WHEN lazy loading é usado THEN o sistema SHALL carregar apenas módulos necessários
3. WHEN componentes são carregados THEN o sistema SHALL usar tree-shaking efetivo
4. WHEN estilos são processados THEN o sistema SHALL ter CSS otimizado sem duplicações
5. WHEN a aplicação roda THEN o sistema SHALL ter tempo de carregamento inicial menor que 2 segundos