import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../errors.js';
import { Restaurant } from '../models/restaurant.js';
import { Suggestion, type SuggestionRecord } from '../models/suggestion.js';
import { text } from '../services/input-fields.js';
import { verifyReplyToken } from '../services/reply-token.js';
import { parseOrThrow } from '../validation.js';

interface RepliesOptions {
  replyTokenSecret: string;
}

const replySchema = z.object({ message: text(2000) });

// Para el enlace del correo no hay distinción: caducado, ya usado, manipulado
// o de una solicitud cerrada dan la misma respuesta.
const gone = () => new ApiError(404, 'not_found', 'El enlace ya no es válido');

// Respuesta de quien propuso a «Info pedida» (docs/02_API_SPEC.md). No hay
// sesión: el enlace firmado del correo es la credencial (ADR 0007).
export function repliesRouter({ replyTokenSecret }: RepliesOptions) {
  const router = Router();

  // La solicitud a la que apunta el enlace, solo si sigue esperando respuesta
  // y el enlace es el último que se envió.
  async function waiting(token: string) {
    const claims = verifyReplyToken(replyTokenSecret, token);
    if (!claims || !/^[0-9a-f]{24}$/.test(claims.suggestionId)) throw gone();
    const record = await Suggestion.findOne({
      _id: claims.suggestionId,
      status: 'info_requested',
      'infoRequest.nonce': claims.nonce,
    }).lean<SuggestionRecord>();
    if (!record?.infoRequest) throw gone();
    return { record, claims };
  }

  router.get('/replies/:token', async (req, res) => {
    const { record } = await waiting(String(req.params.token));
    // El nombre ayuda a reconocer de qué propuesta se trata.
    const name =
      record.type === 'new'
        ? (record.payload as { name?: string }).name
        : (
            await Restaurant.findById(record.targetRestaurantId)
              .select('name')
              .lean<{ name: string }>()
          )?.name;
    res.set('Cache-Control', 'no-store').json({
      name,
      note: record.infoRequest!.note,
      deadline: record.infoRequest!.deadline.toISOString(),
      locale: record.locale,
    });
  });

  router.post('/replies/:token', async (req, res) => {
    const { record, claims } = await waiting(String(req.params.token));
    const { message } = parseOrThrow(replySchema, req.body);

    // El `nonce` se borra al usar el enlace: una segunda respuesta, aunque sea
    // a la vez, no encuentra la solicitud.
    const updated = await Suggestion.updateOne(
      {
        _id: record._id,
        status: 'info_requested',
        'infoRequest.nonce': claims.nonce,
      },
      {
        $set: { status: 'pending' },
        $push: { replies: { message, at: new Date() } },
        $unset: { 'infoRequest.nonce': 1 },
      },
    );
    if (updated.modifiedCount === 0) throw gone();

    res
      .set('Cache-Control', 'no-store')
      .status(201)
      .json({ status: 'received' });
  });

  return router;
}
