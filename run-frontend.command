#!/bin/bash
cd "$(dirname "$0")"
npm install
npm run dev -- --host 127.0.0.1
