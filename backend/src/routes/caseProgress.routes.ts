import { Router } from 'express';
import type { CaseProgressSheetClient } from '../google/caseProgressSheetClient.js';
import { createGetCaseProgress } from '../controllers/caseProgress.controller.js';

export function createCaseProgressRouter(getSheetClient: () => CaseProgressSheetClient): Router {
  const router = Router();
  router.get('/', createGetCaseProgress(getSheetClient));
  return router;
}
