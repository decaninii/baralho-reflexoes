import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Preço da assinatura em teste: R$0,05 (troque depois para o valor real, ex: 14.90)
const SUBSCRIPTION_PRICE = 0.05;

export async function POST() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
  const preapproval = new PreApproval(client);

  try {
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
    console.error('Erro ao criar assinatura MP:', err);
    return NextResponse.json({ error: 'mp_error' }, { status: 500 });
  }
}
