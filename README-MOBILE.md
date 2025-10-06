# 📱 BR-LEGAL 2 - Guia Mobile

## ✅ Capacitor Configurado!

Seu app agora está pronto para ser transformado em aplicativo mobile nativo.

## 🚀 Como Testar no Celular

### 1️⃣ Exportar o Projeto

1. Clique no botão **"Export to Github"** no Lovable
2. Clone o repositório no seu computador:
```bash
git clone [seu-repositorio]
cd [nome-do-projeto]
```

### 2️⃣ Instalar Dependências

```bash
npm install
```

### 3️⃣ Adicionar Plataforma

**Para Android:**
```bash
npx cap add android
npx cap update android
```

**Para iOS (requer Mac com Xcode):**
```bash
npx cap add ios
npx cap update ios
```

### 4️⃣ Compilar o Projeto

```bash
npm run build
npx cap sync
```

### 5️⃣ Rodar no Dispositivo

**Android:**
```bash
npx cap run android
```
- Conecte um celular Android via USB com **Depuração USB** ativa
- Ou use um emulador no Android Studio

**iOS:**
```bash
npx cap run ios
```
- Requer Mac com Xcode instalado
- Conecte um iPhone via USB
- Ou use simulador do Xcode

## 🔄 Atualizações

Sempre que fizer mudanças no código via Lovable:

1. Faça `git pull` do repositório
2. Execute `npx cap sync`
3. Recompile: `npm run build`

## 📝 Requisitos

- **Android**: Android Studio instalado
- **iOS**: Mac com Xcode instalado
- Node.js 18+ instalado

## 📚 Recursos Nativos Disponíveis

Com Capacitor você tem acesso a:
- 📸 Câmera
- 📍 GPS/Localização
- 📁 Sistema de arquivos
- 🔔 Notificações push
- 🌐 Modo offline
- E muito mais!

## 🆘 Precisa de Ajuda?

Leia o guia completo: https://lovable.dev/blogs/TODO

---

**Dica**: Enquanto desenvolve, você pode testar direto no navegador do celular acessando o link do Lovable!
