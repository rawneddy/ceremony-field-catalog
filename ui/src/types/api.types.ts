export interface ErrorResponse {
  message: string;
  status: number;
  timestamp: string;
  error: string;
  errors?: string[];
}
