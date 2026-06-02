export function rowToItem(row) {
  return {
    id: row.id,
    name: row.name,
    qty: row.qty ?? '',
    priceEstimate: Number(row.price_estimate ?? 0),
    priceGuessed: Boolean(row.price_guessed),
    note: row.note ?? '',
    category: row.category ?? 'other',
    status: row.status === 'bought' ? 'bought' : 'active',
    addedBy: row.added_by ?? 'me',
    addedAt: row.added_at,
    checkedBy: row.checked_by ?? null,
    checkedAt: row.checked_at ?? null,
    updatedAt: row.updated_at,
  };
}

export function itemToRow(item, familyId) {
  return {
    id: item.id,
    family_id: familyId,
    name: item.name,
    qty: item.qty ?? '',
    price_estimate: item.priceEstimate,
    price_guessed: Boolean(item.priceGuessed),
    note: item.note ?? '',
    category: item.category ?? 'other',
    status: item.status === 'bought' ? 'bought' : 'active',
    added_by: item.addedBy ?? null,
    added_at: item.addedAt,
    checked_by: item.checkedBy ?? null,
    checked_at: item.checkedAt ?? null,
    updated_at: item.updatedAt,
  };
}
