#!/usr/bin/env python3
import json
import urllib.parse
from pathlib import Path
import time
import multiprocessing
from functools import partial
import os

def process_track(track, base_url):
    """Process a single track and update its coverArt URL if needed."""
    if "coverArt" in track and track["coverArt"].startswith("/"):
        # Get the relative path without the leading slash
        relative_path = track["coverArt"].lstrip("/")
        
        # Split the path to get the directory and filename
        directory = os.path.dirname(relative_path)
        
        # Always use Cover.jpg as the filename
        new_path = f"{directory}/Cover.jpg"
        
        # Split path into segments and encode each segment individually
        path_segments = new_path.split("/")
        encoded_segments = [urllib.parse.quote(segment) for segment in path_segments]
        
        # Join the encoded segments back together
        encoded_path = "/".join(encoded_segments)
        
        # Create the absolute URL
        track["coverArt"] = f"{base_url}/{encoded_path}"
        return True
    return False

def main():
    start_time = time.time()
    
    # Path to the tracks.json file
    tracks_json_path = Path("E:\\WebDev\\tune\\src\\data\\tracks.json")
    
    # Read the file
    print(f"Reading tracks.json from {tracks_json_path}")
    with open(tracks_json_path, "r", encoding="utf-8") as f:
        tracks = json.load(f)
    
    # Domain for the absolute URLs
    base_url = "https://tune-mu.vercel.app"
    
    print(f"Processing {len(tracks)} tracks in parallel...")
    
    # Create a pool of worker processes
    num_cores = multiprocessing.cpu_count()
    pool = multiprocessing.Pool(processes=num_cores)
    
    # Process tracks in parallel
    process_func = partial(process_track, base_url=base_url)
    results = pool.map(process_func, tracks)
    
    # Close the pool to prevent any more tasks from being submitted
    pool.close()
    
    # Wait for all worker processes to complete
    pool.join()
    
    # Count how many tracks were updated
    updated_count = sum(1 for result in results if result)
    
    # Write the updated tracks back to the file
    with open(tracks_json_path, "w", encoding="utf-8") as f:
        json.dump(tracks, f, ensure_ascii=False, indent=2)
    
    end_time = time.time()
    elapsed_time = end_time - start_time
    
    print(f"Updated {updated_count} coverArt URLs")
    print(f"Processing completed in {elapsed_time:.2f} seconds using {num_cores} CPU cores")

if __name__ == "__main__":
    # Use 'spawn' method for better compatibility across platforms
    multiprocessing.set_start_method('spawn', force=True)
    main() 