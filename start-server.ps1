Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Servidor Local - Controle WhatsApp" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Iniciando servidor na porta 8000..." -ForegroundColor Green
Write-Host ""
Write-Host "Abra seu navegador em: http://localhost:8000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Gray
Write-Host ""

# Tenta Python 3 primeiro, depois Python 2
try {
    python -m http.server 8000
} catch {
    try {
        python -m SimpleHTTPServer 8000
    } catch {
        Write-Host "Erro: Python não encontrado!" -ForegroundColor Red
        Write-Host "Instale Python ou use Node.js com: http-server -p 8000" -ForegroundColor Yellow
        pause
    }
}






