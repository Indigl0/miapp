import { db } from './db';
import { uuid, now } from './uuid';
import type { Exercise, MuscleGroup } from './types';

const SEED_EXERCISES: Array<{ name: string; muscleGroup: MuscleGroup }> = [
  { name: 'Press de Banca Plano', muscleGroup: 'Pecho' },
  { name: 'Press de Banca Inclinado', muscleGroup: 'Pecho' },
  { name: 'Aperturas con Mancuernas', muscleGroup: 'Pecho' },
  { name: 'Fondos en Paralelas', muscleGroup: 'Pecho' },
  { name: 'Peso Muerto Convencional', muscleGroup: 'Espalda' },
  { name: 'Dominadas', muscleGroup: 'Espalda' },
  { name: 'Remo con Barra', muscleGroup: 'Espalda' },
  { name: 'Jalón al Pecho', muscleGroup: 'Espalda' },
  { name: 'Sentadilla', muscleGroup: 'Piernas' },
  { name: 'Prensa de Piernas', muscleGroup: 'Piernas' },
  { name: 'Zancadas', muscleGroup: 'Piernas' },
  { name: 'Peso Muerto Rumano', muscleGroup: 'Piernas' },
  { name: 'Press Militar', muscleGroup: 'Hombros' },
  { name: 'Elevaciones Laterales', muscleGroup: 'Hombros' },
  { name: 'Face Pulls', muscleGroup: 'Hombros' },
  { name: 'Curl de Bíceps con Barra', muscleGroup: 'Brazos' },
  { name: 'Curl Martillo', muscleGroup: 'Brazos' },
  { name: 'Extensión de Tríceps en Polea', muscleGroup: 'Brazos' },
  { name: 'Curl de Bíceps con Mancuernas', muscleGroup: 'Brazos' },
  { name: 'Plancha (Plank)', muscleGroup: 'Core' },
  { name: 'Crunch en Polea', muscleGroup: 'Core' },
  { name: 'Elevación de Piernas Colgado', muscleGroup: 'Core' },
  { name: 'Hip Thrust', muscleGroup: 'Glúteos' },
  { name: 'Patada de Glúteo en Polea', muscleGroup: 'Glúteos' },
  { name: 'Cinta de Correr', muscleGroup: 'Cardio' },
  { name: 'Bicicleta Estática', muscleGroup: 'Cardio' },
];

export async function seedExercises(): Promise<void> {
  const exCount = await db.exercises.count();
  if (exCount > 0) return;
  const ts = now();
  const exercises: Exercise[] = SEED_EXERCISES.map((e) => ({
    id: uuid(), name: e.name, muscleGroup: e.muscleGroup, createdAt: ts, updatedAt: ts,
  }));
  await db.exercises.bulkAdd(exercises);
}
