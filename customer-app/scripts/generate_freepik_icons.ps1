param(
  [Parameter(Mandatory = $true)]
  [string]$ApiKey
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $projectRoot "public\generated-icons"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$iconSpecs = @(
  @{ Name = "South Indian"; Slug = "south-indian"; Prompt = "A premium food app icon for South Indian cuisine, centered, transparent background, flat illustrated style, dosa and idli inspiration, warm amber cream and soft terracotta palette, clean edges, no text" },
  @{ Name = "Biryani"; Slug = "biryani"; Prompt = "A premium food app icon for biryani, centered, transparent background, flat illustrated style, aromatic rice bowl with subtle garnish, warm amber cream and saffron palette, clean edges, no text" },
  @{ Name = "Pizza"; Slug = "pizza"; Prompt = "A premium food app icon for pizza, centered, transparent background, flat illustrated style, wood fired slice, warm amber cream and tomato palette, clean edges, no text" },
  @{ Name = "Burgers"; Slug = "burgers"; Prompt = "A premium food app icon for burgers, centered, transparent background, flat illustrated style, stacked gourmet burger, warm amber cream and toasted bun palette, clean edges, no text" },
  @{ Name = "Chinese"; Slug = "chinese"; Prompt = "A premium food app icon for Chinese cuisine, centered, transparent background, flat illustrated style, noodles bowl with chopsticks, warm amber cream and red accents, clean edges, no text" },
  @{ Name = "Desserts"; Slug = "desserts"; Prompt = "A premium food app icon for desserts, centered, transparent background, flat illustrated style, elegant cake slice, warm amber cream and caramel palette, clean edges, no text" },
  @{ Name = "Street Food"; Slug = "street-food"; Prompt = "A premium food app icon for street food, centered, transparent background, flat illustrated style, vibrant snack platter inspiration, warm amber cream and spice palette, clean edges, no text" },
  @{ Name = "Beverages"; Slug = "beverages"; Prompt = "A premium food app icon for beverages, centered, transparent background, flat illustrated style, cafe cup and cool drink inspiration, warm amber cream and mocha palette, clean edges, no text" },
  @{ Name = "Starters"; Slug = "starters"; Prompt = "A premium food app icon for starters, centered, transparent background, flat illustrated style, appetizer platter inspiration, warm amber cream and grilled spice palette, clean edges, no text" },
  @{ Name = "Biryani Specials"; Slug = "biryani-specials"; Prompt = "A premium food app icon for biryani specials, centered, transparent background, flat illustrated style, royal biryani pot inspiration, warm amber cream and saffron palette, clean edges, no text" },
  @{ Name = "Breads & Gravies"; Slug = "breads-gravies"; Prompt = "A premium food app icon for breads and gravies, centered, transparent background, flat illustrated style, naan and curry bowl inspiration, warm amber cream and rustic palette, clean edges, no text" },
  @{ Name = "Quick Bites & Add-ons"; Slug = "quick-bites-addons"; Prompt = "A premium food app icon for quick bites and add-ons, centered, transparent background, flat illustrated style, snack trio inspiration, warm amber cream and spice palette, clean edges, no text" },
  @{ Name = "Sides"; Slug = "sides"; Prompt = "A premium food app icon for side dishes, centered, transparent background, flat illustrated style, fries and dip inspiration, warm amber cream and toasted palette, clean edges, no text" },
  @{ Name = "Pasta"; Slug = "pasta"; Prompt = "A premium food app icon for pasta, centered, transparent background, flat illustrated style, elegant pasta bowl inspiration, warm amber cream and herb palette, clean edges, no text" },
  @{ Name = "Drinks"; Slug = "drinks"; Prompt = "A premium food app icon for drinks, centered, transparent background, flat illustrated style, iced drink glass inspiration, warm amber cream and citrus palette, clean edges, no text" },
  @{ Name = "Ramen"; Slug = "ramen"; Prompt = "A premium food app icon for ramen, centered, transparent background, flat illustrated style, ramen bowl inspiration, warm amber cream and umami palette, clean edges, no text" }
)

$baseHeaders = @{
  "Content-Type" = "application/json"
  "Accept" = "application/json"
  "x-freepik-api-key" = $ApiKey
}

foreach ($icon in $iconSpecs) {
  $targetFile = Join-Path $outputDir "$($icon.Slug).png"
  if (Test-Path $targetFile) {
    Write-Host "Skipping existing icon: $($icon.Name)"
    continue
  }

  Write-Host "Generating icon: $($icon.Name)"
  $body = @{
    prompt = $icon.Prompt
    aspect_ratio = "square_1_1"
  } | ConvertTo-Json

  $createResponse = Invoke-RestMethod -Method Post -Uri "https://api.freepik.com/v1/ai/mystic" -Headers $baseHeaders -Body $body
  $taskId = $createResponse.data.task_id

  if (-not $taskId) {
    throw "Freepik did not return a task_id for $($icon.Name)"
  }

  $status = $createResponse.data.status
  $attempt = 0
  while ($status -ne "COMPLETED" -and $attempt -lt 40) {
    Start-Sleep -Seconds 3
    $attempt++
    $taskResponse = Invoke-RestMethod -Method Get -Uri "https://api.freepik.com/v1/ai/mystic/$taskId" -Headers @{ "Accept" = "application/json"; "x-freepik-api-key" = $ApiKey }
    $status = $taskResponse.data.status

    if ($status -eq "FAILED") {
      throw "Freepik task failed for $($icon.Name)"
    }

    if ($status -eq "COMPLETED") {
      $imageUrl = $taskResponse.data.generated[0]
      Invoke-WebRequest -Uri $imageUrl -OutFile $targetFile
      break
    }
  }

  if (-not (Test-Path $targetFile)) {
    throw "Timed out waiting for generated icon for $($icon.Name)"
  }
}

Write-Host "Icon generation complete."
