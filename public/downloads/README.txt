Letakkan file installer di folder ini jika ingin memakai opsi "public folder":

- public/downloads/pos-pro.apk
- public/downloads/pos-pro-debug.apk (opsional, untuk testing internal)
- public/downloads/pos-pro-setup.exe

Catatan:
- Jangan commit file APK/EXE besar ke GitHub.
- Untuk production, lebih disarankan gunakan storage eksternal (R2/S3/Supabase/Drive)
  lalu set environment variable:
  - NEXT_PUBLIC_ANDROID_APK_URL
  - NEXT_PUBLIC_WINDOWS_EXE_URL
