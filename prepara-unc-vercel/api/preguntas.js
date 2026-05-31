export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { area, tema, nivel, preguntasAnteriores } = req.body;

  const nivelDesc = {
    1: 'nivel BÁSICO, estilo exacto del examen de admisión de la UNC (Universidad Nacional de Cajamarca), preguntas directas y claras',
    2: 'nivel INTERMEDIO, estilo UNALM o UPCH del Perú, mayor profundidad conceptual',
    3: 'nivel AVANZADO, estilo PUCP del Perú, pensamiento crítico y razonamiento elaborado',
    4: 'nivel MÁXIMO, estilo UNMSM o UNI del Perú, alta complejidad, múltiples conceptos integrados'
  };

  const temaText = tema
    ? `específicamente sobre el subtema "${tema}" dentro del área "${area}"`
    : `del área "${area}"`;

  const avoid = preguntasAnteriores?.length > 0
    ? `\nNO repitas estas preguntas anteriores: ${preguntasAnteriores.slice(-5).join(' | ').substring(0, 300)}`
    : '';

  const prompt = `Eres un experto en el examen de admisión de la Universidad Nacional de Cajamarca (UNC), Perú. Crea UNA pregunta de opción múltiple ${temaText}, al ${nivelDesc[nivel] || nivelDesc[1]}.${avoid}

Reglas:
- 5 opciones (A, B, C, D, E)
- Solo una respuesta correcta
- La explicación debe ser didáctica, clara y mencionar por qué la respuesta es correcta y por qué las otras opciones son incorrectas
- Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown, sin backticks

Formato exacto:
{"pregunta":"texto completo de la pregunta","opciones":["A) opción uno","B) opción dos","C) opción tres","D) opción cuatro","E) opción cinco"],"correcta":"A","explicacion":"Explicación didáctica completa aquí."}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: err.error?.message || 'Error de API' });
    }

    const data = await response.json();
    let text = data.content[0].text.trim().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    return res.status(200).json(parsed);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
