-- Peer-to-peer payment options whose details are arranged over WhatsApp
-- after the order is placed. No payment credentials are collected by the
-- site for any of these — the order is recorded as awaiting payment and
-- confirmed manually once funds clear.

alter type payment_method add value if not exists 'cashapp';
alter type payment_method add value if not exists 'venmo';
alter type payment_method add value if not exists 'chime';
alter type payment_method add value if not exists 'zelle';
alter type payment_method add value if not exists 'applepay';
