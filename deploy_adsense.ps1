# Transfer changed files
scp -O -i id_ed25519_streamcast frontend\pages\_document.tsx root@72.62.91.240:/root/streamcast/frontend/pages/_document.tsx
scp -O -i id_ed25519_streamcast frontend\pages\terms.tsx root@72.62.91.240:/root/streamcast/frontend/pages/terms.tsx
scp -O -i id_ed25519_streamcast frontend\pages\privacy.tsx root@72.62.91.240:/root/streamcast/frontend/pages/privacy.tsx
scp -O -i id_ed25519_streamcast frontend\components\Layout.tsx root@72.62.91.240:/root/streamcast/frontend/components/Layout.tsx
scp -O -i id_ed25519_streamcast frontend\components\ConsentBanner.tsx root@72.62.91.240:/root/streamcast/frontend/components/ConsentBanner.tsx

# Run build and restart commands on VPS
ssh -i id_ed25519_streamcast root@72.62.91.240 "bash -lc 'chmod +x /root/remote_deploy.sh && /root/remote_deploy.sh'"
