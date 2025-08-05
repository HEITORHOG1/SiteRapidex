export interface Estabelecimento {
  id: number;
  usuarioId: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  endereco: string;
  status: boolean;
  cep: string;
  numero: string;
  dataCadastro: string;
  latitude: number;
  longitude: number;
  raioEntregaKm: number;
  taxaEntregaFixa: number;
  descricao: string;
}

export interface EstabelecimentoResponse {
  estabelecimentos: Estabelecimento[];
  total: number;
}

export interface EstabelecimentoListParams {
  proprietarioId: string;
  page?: number;
  limit?: number;
}
