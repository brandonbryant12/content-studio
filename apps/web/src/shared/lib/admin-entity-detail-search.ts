export interface AdminEntityDetailSearch {
  readonly userId?: string;
}

export const parseAdminEntityDetailSearch = (
  search: Record<string, unknown>,
): AdminEntityDetailSearch => ({
  userId:
    typeof search.userId === 'string' && search.userId.trim().length > 0
      ? search.userId
      : undefined,
});
