# Script pour créer et démarrer le conteneur PostgreSQL pour QR Dynamic

$containerName = "postgres-qr-dynamic"
$dbName = "qr_dynamic"
$dbUser = "postgres"
$dbPassword = "postgres"
$dbPort = "5432"

Write-Host "Verification de Docker..." -ForegroundColor Cyan

# Vérifier si Docker est accessible
try {
    docker ps | Out-Null
    Write-Host "Docker est accessible" -ForegroundColor Green
} catch {
    Write-Host "Docker n'est pas accessible. Assurez-vous que Docker Desktop est demarre." -ForegroundColor Red
    exit 1
}

# Vérifier si le conteneur existe déjà
$existingContainer = docker ps -a --filter "name=$containerName" --format "{{.Names}}"

if ($existingContainer -eq $containerName) {
    Write-Host "Le conteneur $containerName existe deja." -ForegroundColor Yellow
    
    # Vérifier s'il est en cours d'exécution
    $running = docker ps --filter "name=$containerName" --format "{{.Names}}"
    
    if ($running -eq $containerName) {
        Write-Host "Le conteneur est deja en cours d'execution" -ForegroundColor Green
    } else {
        Write-Host "Demarrage du conteneur..." -ForegroundColor Cyan
        docker start $containerName
        Write-Host "Conteneur demarre" -ForegroundColor Green
    }
} else {
    Write-Host "Creation du conteneur PostgreSQL..." -ForegroundColor Cyan
    
    docker run --name $containerName -e POSTGRES_PASSWORD=$dbPassword -e POSTGRES_DB=$dbName -e POSTGRES_USER=$dbUser -p "${dbPort}:5432" -d postgres:15
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Conteneur PostgreSQL cree et demarre" -ForegroundColor Green
        Write-Host "Attente du demarrage complet de PostgreSQL (10 secondes)..." -ForegroundColor Cyan
        Start-Sleep -Seconds 10
    } else {
        Write-Host "Erreur lors de la creation du conteneur" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "=== Configuration PostgreSQL ===" -ForegroundColor Cyan
Write-Host "Host: localhost"
Write-Host "Port: $dbPort"
Write-Host "Database: $dbName"
Write-Host "User: $dbUser"
Write-Host "Password: $dbPassword"
Write-Host ""
Write-Host "PostgreSQL est pret !" -ForegroundColor Green
Write-Host ""
Write-Host "Mettez a jour votre fichier .env avec ces valeurs :" -ForegroundColor Yellow
Write-Host "DB_HOST=127.0.0.1"
Write-Host "DB_PORT=$dbPort"
Write-Host "DB_USER=$dbUser"
Write-Host "DB_PASSWORD=$dbPassword"
Write-Host "DB_DATABASE=$dbName"
