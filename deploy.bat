:: ==============================================================
:: Script: deploy.bat
:: Função: Automatiza o deploy do site OperaVia.online
:: Autor: Cássia Sampaio
:: Data: 30/10/2025
:: Descrição:
:: - Gera o build (npm run build)
:: - Cria uma branch temporária com o conteúdo da pasta dist
:: - Publica na branch gh-pages do GitHub
:: - Remove a branch temporária local
:: - Abre automaticamente o site no navegador
:: ==============================================================
:: Sempre que você quiser publicar uma versão nova:
:: Garante que suas alterações já foram commitadas e push na main:
:: git add .
:: git commit -m "minhas mudanças"
:: git push origin main
:: Depois é só dar dois cliques no deploy.bat (ou rodar deploy.bat no terminal dentro da pasta do projeto).
:: Pronto. Você vira dona do seu próprio release - OPERAVIA.ONLINE rodando direto. ????

@echo off
echo ===== Iniciando deploy do OperaVia =====

@echo off
echo ===== Iniciando deploy do OperaVia =====

REM 1. garante que estamos na main e atualizados
git checkout main
git pull origin main

REM 2. build de producao
echo.
echo ===== Gerando build (npm run build) =====
npm run build
IF %ERRORLEVEL% NEQ 0 (
    echo ERRO: build falhou. Deploy abortado.
    pause
    exit /b 1
)

REM 3. cria branch temporaria com o conteudo da pasta dist
echo.
echo ===== Extraindo subtree de dist para gh-pages-temp =====
git subtree split --prefix dist -b gh-pages-temp
IF %ERRORLEVEL% NEQ 0 (
    echo ERRO: nao foi possivel criar gh-pages-temp.
    pause
    exit /b 1
)

REM 4. envia para a branch gh-pages remota (forcado)
echo.
echo ===== Publicando no GitHub Pages (branch gh-pages) =====
git push origin gh-pages-temp:gh-pages --force
IF %ERRORLEVEL% NEQ 0 (
    echo ERRO: push para gh-pages falhou.
    pause
    exit /b 1
)

REM 5. apaga branch temporaria local
echo.
echo ===== Limpando branch temporaria =====
git branch -D gh-pages-temp

REM 6. abre o site automaticamente no navegador
echo.
echo ===== DEPLOY CONCLUIDO COM SUCESSO =====
start https://operavia.online

pause
