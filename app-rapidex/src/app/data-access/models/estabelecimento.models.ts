import { ApiResponse } from './api-response.models';

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

// API Response Wrappers for new API format
export type EstabelecimentoApiResponse = ApiResponse<Estabelecimento>;
export type EstabelecimentoListApiResponse = ApiResponse<EstabelecimentoResponse>;
export type EstabelecimentoCreateApiResponse = ApiResponse<Estabelecimento>;
export type EstabelecimentoUpdateApiResponse = ApiResponse<Estabelecimento>;
export type EstabelecimentoDeleteApiResponse = ApiResponse<{ id: number }>;
