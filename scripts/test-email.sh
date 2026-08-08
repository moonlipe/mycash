#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:8787}"
COOKIE="${COOKIE:-}"

if [ -z "$COOKIE" ]; then
  echo "==> Obtendo token via login..."
  EMAIL="${EMAIL:?Defina EMAIL=seu@email.com para login}"
  PASSWORD="${PASSWORD:?Defina PASSWORD=sua-senha para login}"

  LOGIN=$(curl -s -D - "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>/dev/null)

  COOKIE=$(echo "$LOGIN" | grep -i 'set-cookie' | grep -o 'token=[^;]*')

  if [ -z "$COOKIE" ]; then
    echo "✘ Falha no login. Verifique EMAIL/PASSWORD."
    exit 1
  fi
  echo "✓ Token obtido"
fi

echo "==> Enviando e-mail de teste..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/email/test" \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json" \
  -X POST)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP $HTTP_CODE"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
  echo ""
  echo "✓ E-mail de teste enviado! Verifique sua caixa de entrada ou o dashboard do Mailtrap."
else
  echo ""
  echo "✘ Falha. Detalhes acima."
fi
