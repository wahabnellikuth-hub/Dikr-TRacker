$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()
Write-Host "Listening on http://localhost:8080/"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $requestUrl = $context.Request.Url.LocalPath
        if ($requestUrl -eq "/") { $requestUrl = "/index.html" }
        
        # Prevent directory traversal
        $requestUrl = $requestUrl.Replace("..", "")
        
        $filePath = Join-Path (Get-Location).Path $requestUrl
        
        if (Test-Path $filePath -PathType Leaf) {
            $buffer = [System.IO.File]::ReadAllBytes($filePath)
            $context.Response.ContentLength64 = $buffer.Length
            
            if ($requestUrl.EndsWith(".html")) { $context.Response.ContentType = "text/html" }
            elseif ($requestUrl.EndsWith(".css")) { $context.Response.ContentType = "text/css" }
            elseif ($requestUrl.EndsWith(".js")) { $context.Response.ContentType = "application/javascript" }
            
            $context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
        } else {
            $context.Response.StatusCode = 404
        }
        $context.Response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
}
