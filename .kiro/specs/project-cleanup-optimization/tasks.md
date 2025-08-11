# Implementation Plan - Limpeza e Otimização do Projeto Angular

- [x] 1. Criar modelos TypeScript para o novo formato de resposta da API
  - Criar interface `ApiResponse<T>` com campos success, message, data, errors, timestamp
  - Criar interface `ApiError` para tratamento de erros
  - Atualizar modelos existentes para trabalhar com o novo formato
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 2. Implementar interceptor para transformar respostas da API automaticamente
  - Criar `api-response.interceptor.ts` que extrai dados do campo `data`
  - Implementar verificação do campo `success` antes de processar
  - Implementar tratamento de erros usando o array `errors`
  - Configurar interceptor na aplicação
  - _Requirements: 8.1, 8.2, 8.3, 10.4_

- [x] 3. Atualizar serviço de autenticação para novo formato da API
  - Modificar `auth.service.ts` para trabalhar com `ApiResponse<LoginResponse>`
  - Atualizar método `login()` para extrair dados do campo `data`
  - Atualizar método `refreshToken()` para novo formato
  - Testar fluxo completo de login → dashboard
  - _Requirements: 8.1, 8.2, 8.6_

- [x] 4. Corrigir URLs da API para usar porta 5285
  - Atualizar `environment.ts` com `apiUrl: 'http://localhost:5283/api'`
  - Verificar todos os serviços que fazem chamadas HTTP
  - Garantir uso consistente da base URL em toda aplicação
  - _Requirements: 8.5_

- [x] 5. Modernizar funções SCSS deprecadas
  - Substituir `darken()` por `color.adjust()` em todos arquivos SCSS
  - Substituir `lighten()` por `color.adjust()` em todos arquivos SCSS
  - Adicionar `@use 'sass:color'` onde necessário
  - Testar que aparência visual permanece idêntica
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 6. Modernizar imports SCSS deprecados
  - Substituir `@import` por `@use` em todos arquivos SCSS
  - Atualizar referências a variáveis e mixins conforme necessário
  - Verificar que não há conflitos de namespace
  - _Requirements: 1.3, 1.4_

- [x] 7. Remover componentes e diretivas não utilizadas
  - Remover `AriaAnnounceDirective` dos imports não utilizados
  - Remover `FocusTrapDirective` dos imports não utilizados
  - Remover `KeyboardNavigationDirective` dos imports não utilizados
  - Remover `AriaDescribedByDirective` dos imports não utilizados
  - Remover `HighContrastDirective` dos imports não utilizados
  - Remover `CategoryVirtualScrollComponent` não utilizada
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 8. Simplificar monitoramento de performance no main.ts
  - Remover monitoramento complexo de memória
  - Remover intervalos de monitoramento contínuo
  - Manter apenas bootstrap básico da aplicação
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9. Remover funcionalidades offline e cache desnecessário
  - Identificar e remover código relacionado a cache offline
  - Remover service workers se existirem
  - Remover funcionalidades de sincronização offline
  - Configurar aplicação para sempre consultar API
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 10. Simplificar interceptors HTTP
  - Manter apenas `api-response.interceptor.ts`, `auth-token.interceptor.ts` e `error.interceptor.ts`
  - Remover lógica complexa de retry e cache dos interceptors
  - Simplificar tratamento de erros para ser direto e consistente
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 11. Limpar dependências desnecessárias do package.json
  - Analisar dependências não utilizadas no código
  - Remover bibliotecas não essenciais
  - Manter apenas Angular core, Material, RxJS e Chart.js
  - Simplificar scripts de build e desenvolvimento
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 12. Configurar aplicação para ser sempre online
  - Remover lógica de retry offline dos interceptors
  - Configurar serviços para sempre fazer requisições HTTP diretas
  - Implementar mensagens claras de erro de rede
  - Desabilitar funcionalidades quando há perda de conexão
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 13. Otimizar bundle size e performance
  - Verificar lazy loading de módulos
  - Implementar tree-shaking efetivo
  - Otimizar CSS para remover duplicações
  - Configurar build para bundle menor que 500KB inicial
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 14. Testar fluxo completo de login e redirecionamento
  - Testar login com credenciais válidas → redirecionamento para dashboard
  - Testar login com credenciais inválidas → exibição de erro
  - Testar refresh automático de token
  - Testar logout e redirecionamento para login
  - Verificar que não há warnings no console
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6_
