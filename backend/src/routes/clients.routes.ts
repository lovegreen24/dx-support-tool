import { Router } from 'express';
import type { ClientStore } from '../db/clientStore.js';
import { createGetClients } from '../controllers/clients.controller.js';

export function createClientsRouter(store: ClientStore): Router {
  const router = Router();
  router.get('/', createGetClients(store));
  return router;
}
