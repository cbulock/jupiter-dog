#!/bin/bash

bucket_name="jupiter-images"

# Retrieve the list of blob keys
blob_keys=$(netlify blobs:list $bucket_name | awk 'NR>5 {print $1}')

# Iterate over the blob keys and delete each blob
for key in $blob_keys; do
    netlify blobs:delete $bucket_name $key
    echo "Deleted blob: $key"
done