import { ErrorDetails } from "../models/errorDetails";
import { emptyServer, Server } from "../models/server";
import { ApiClient } from "./apiClient";
import CredentialsService from "./credentialsService";

export default class ServerService {
  public static async getServers(abortSignal?: AbortSignal): Promise<Server[]> {
    const response = await ApiClient.get(`/api/witsml-servers`, abortSignal, undefined);
    if (response.ok) {
      return response.json();
    } else {
      return [];
    }
  }

  public static async addServer(server: Server, abortSignal?: AbortSignal): Promise<Server> {
    const response = await ApiClient.post(`/api/witsml-servers`, JSON.stringify(server), abortSignal, undefined);
    if (response.ok) {
      const result = await response.json();
      CredentialsService.addServer(result);
      return result;
    } else {
      return emptyServer();
    }
  }

  public static async updateServer(server: Server, abortSignal?: AbortSignal): Promise<Server> {
    const response = await ApiClient.patch(`/api/witsml-servers/${server.id}`, JSON.stringify(server), abortSignal);
    if (response.ok) {
      const result = await response.json();
      CredentialsService.updateServer(result);
      return result;
    } else {
      return emptyServer();
    }
  }

  public static async removeServer(serverUid: string, abortSignal?: AbortSignal): Promise<boolean> {
    const response = await ApiClient.delete(`/api/witsml-servers/${serverUid}`, abortSignal);
    if (response.ok) {
      CredentialsService.removeServer(serverUid);
      return true;
    } else {
      const { message }: ErrorDetails = await response.json();
      this.throwError(response.status, message);
    }
  }

  private static throwError(statusCode: number, message: string) {
    switch (statusCode) {
      case 401:
      case 404:
      case 500:
        throw new Error(message);
      default:
        throw new Error(`Something unexpected has happened.`);
    }
  }
}
