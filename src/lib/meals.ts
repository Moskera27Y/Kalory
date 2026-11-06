/** Comidas del diario en orden de presentación. Fuente única: si cambia, cambia en toda la app. */
export const MEALS = ['Desayuno', 'Almuerzo', 'Cena', 'Snack', 'Extra'] as const;
export type Meal = (typeof MEALS)[number];
