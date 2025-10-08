import { CLAIM_STATUS } from "ffc-ahwr-common-library";

export const closedViewStatuses = [
  CLAIM_STATUS.WITHDRAWN,
  CLAIM_STATUS.REJECTED,
  CLAIM_STATUS.NOT_AGREED,
  CLAIM_STATUS.READY_TO_PAY,
  CLAIM_STATUS.PAID,
];

export const CLAIM_STATUSES = CLAIM_STATUS;
