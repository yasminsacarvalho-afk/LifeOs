#!/bin/bash
source .env
curl -s -X GET "$VITE_SUPABASE_URL/rest/v1/pos_library?select=*&limit=1" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" > res.json
cat res.json | grep -o 'cover_url'
