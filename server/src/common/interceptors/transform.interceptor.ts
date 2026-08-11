import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

const DEFAULT_MESSAGE = "Requisição concluída com sucesso.";

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((result) => {
        if (
          result &&
          typeof result === "object" &&
          "message" in (result as Record<string, unknown>) &&
          "data" in (result as Record<string, unknown>)
        ) {
          const { message, data } = result as unknown as { message: string; data: T };
          return { success: true, message, data };
        }
        return { success: true, message: DEFAULT_MESSAGE, data: result };
      }),
    );
  }
}
