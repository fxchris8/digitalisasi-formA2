/**
 * Domain model — representasi data entitas Ship, mapping ke skema DB.
 */
export interface Ship {
  id: string
  name: string
  created_at: Date
  updated_at: Date
}
