$bucketName = "jupiter-images"

# Retrieve the list of blob keys
$blobKeys = netlify blobs:list $bucketName | Select-Object -Skip 5 | ForEach-Object {
    $columns = $_.Trim() -split '\s+'
    if ($columns.Count -ge 2) {
        $columns[1]
    }
}

# Iterate over the blob keys and delete each blob
foreach ($key in $blobKeys) {
    if ($key -ne "") {
        netlify blobs:delete $bucketName $key
        Write-Host "Deleted blob: $key"
    }
}