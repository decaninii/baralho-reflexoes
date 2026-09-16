import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const SUBSCRIPTION_PRICE = 0.01;

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Faltando SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente.' }, { status: 500 });
    }
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Faltando MERCADOPAGO_ACCESS_TOKEN nas variáveis de ambiente.' }, { status: 500 });
    }

    const admin = supabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'not_authenticated', debug_auth_error: authError?.message || null }, { status: 401 });
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
    const preapproval = new PreApproval(client);

    const result = await preapproval.create({
      body: {
        reason: 'Assinatura Minuto de Reflexão',
        external_reference: user.id, // usamos isso no webhook pra saber de quem é
        payer_email: user.email,
        back_url: `${process.env.NEXT_PUBLIC_SITE_URL}/`,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: SUBSCRIPTION_PRICE,
          currency_id: 'BRL',
        },
        status: 'pending',
      },
    });

    return NextResponse.json({ checkoutUrl: result.init_point });
  } catch (err) {
    // DEBUG TEMPORÁRIO: expõe o erro real na resposta, pra gente ver na
    // aba Network sem precisar abrir o log do Vercel. Remover depois.
    console.error('Erro ao criar assinatura:', err);
    return NextResponse.json({
      error: 'mp_error',
      debug_message: err?.message || String(err),
      debug_cause: err?.cause || null,
      debug_status: err?.status || err?.statusCode || null,
    }, { status: 500 });
  }
}
