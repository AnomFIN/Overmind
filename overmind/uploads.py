"""
Upload file management with TTL and capacity cap
Handles 15-minute TTL expiry and 5GB capacity enforcement with LRU cleanup.
"""

import os
import json
import time
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta

# Set up logger
logger = logging.getLogger(__name__)


class UploadManager:
    """Manages temporary uploads with TTL and capacity cap"""
    
    # Constants
    DEFAULT_TTL_SECONDS = 15 * 60  # 15 minutes
    MAX_CAPACITY_BYTES = 5 * 1024 * 1024 * 1024  # 5 GB
    
    def __init__(self, uploads_dir: Path):
        self.uploads_dir = Path(uploads_dir)
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
    
    def get_all_files(self) -> List[Dict[str, Any]]:
        """Get list of all uploaded files with metadata"""
        files = []
        
        if not self.uploads_dir.exists():
            return files
        
        for file_path in self.uploads_dir.iterdir():
            if file_path.is_file() and not file_path.name.endswith('.meta.json'):
                try:
                    stat = file_path.stat()
                    meta_path = file_path.parent / f"{file_path.name}.meta.json"
                    
                    # Read metadata if available
                    metadata = {}
                    if meta_path.exists():
                        try:
                            with open(meta_path, 'r') as f:
                                metadata = json.load(f)
                        except Exception:
                            pass
                    
                    # Calculate expiry time (15 minutes from creation)
                    created_at = datetime.fromtimestamp(stat.st_mtime)
                    expires_at = created_at + timedelta(seconds=self.DEFAULT_TTL_SECONDS)
                    
                    files.append({
                        "name": file_path.name,
                        "path": str(file_path),
                        "size": stat.st_size,
                        "created_at": created_at,
                        "expires_at": expires_at,
                        "original_name": metadata.get("originalName", file_path.name),
                        "mimetype": metadata.get("mimetype", "application/octet-stream")
                    })
                except (OSError, PermissionError) as e:
                    logger.error(f"Error reading file {file_path}: {e}")
        
        return files
    
    def get_total_size(self) -> int:
        """Get total size of all uploads in bytes"""
        total = 0
        for file_info in self.get_all_files():
            total += file_info["size"]
        return total
    
    def get_expiring_soon(self, minutes: int = 5) -> List[Dict[str, Any]]:
        """Get files that will expire within the specified minutes"""
        now = datetime.now()
        threshold = now + timedelta(minutes=minutes)
        
        files = self.get_all_files()
        return [f for f in files if now < f["expires_at"] <= threshold]
    
    def cleanup_expired(self) -> Tuple[int, int]:
        """Remove expired files (TTL cleanup)
        
        Returns:
            Tuple of (files_deleted, bytes_freed)
        """
        files_deleted = 0
        bytes_freed = 0
        now = datetime.now()
        
        files = self.get_all_files()
        for file_info in files:
            if file_info["expires_at"] < now:
                try:
                    file_path = Path(file_info["path"])
                    size = file_info["size"]
                    
                    # Delete the file
                    file_path.unlink()
                    
                    # Delete metadata if exists
                    meta_path = file_path.parent / f"{file_path.name}.meta.json"
                    if meta_path.exists():
                        meta_path.unlink()
                    
                    files_deleted += 1
                    bytes_freed += size
                    logger.info(f"[TTL] Removed expired file: {file_info['name']} ({self._format_bytes(size)})")
                    
                except Exception as e:
                    logger.error(f"[TTL] Error deleting {file_info['name']}: {e}")
        
        return files_deleted, bytes_freed
    
    def cleanup_over_capacity(self) -> Tuple[int, int]:
        """Remove oldest files if total size exceeds capacity cap
        
        Returns:
            Tuple of (files_deleted, bytes_freed)
        """
        files_deleted = 0
        bytes_freed = 0
        
        total_size = self.get_total_size()
        
        if total_size <= self.MAX_CAPACITY_BYTES:
            return files_deleted, bytes_freed
        
        # Sort files by creation time (oldest first)
        files = sorted(self.get_all_files(), key=lambda x: x["created_at"])
        
        for file_info in files:
            if total_size <= self.MAX_CAPACITY_BYTES:
                break
            
            try:
                file_path = Path(file_info["path"])
                size = file_info["size"]
                
                # Delete the file
                file_path.unlink()
                
                # Delete metadata if exists
                meta_path = file_path.parent / f"{file_path.name}.meta.json"
                if meta_path.exists():
                    meta_path.unlink()
                
                files_deleted += 1
                bytes_freed += size
                total_size -= size
                logger.info(f"[Cap] Removed oldest file: {file_info['name']} ({self._format_bytes(size)})")
                
            except Exception as e:
                logger.error(f"[Cap] Error deleting {file_info['name']}: {e}")
        
        return files_deleted, bytes_freed
    
    def run_cleanup(self) -> Dict[str, Any]:
        """Run full cleanup: TTL expiry + capacity enforcement
        
        Returns:
            Dictionary with cleanup statistics
        """
        logger.info("Starting cleanup process...")
        
        # Phase 1: Remove expired files
        ttl_files, ttl_bytes = self.cleanup_expired()
        
        # Phase 2: Remove oldest files if over capacity
        cap_files, cap_bytes = self.cleanup_over_capacity()
        
        total_files = ttl_files + cap_files
        total_bytes = ttl_bytes + cap_bytes
        
        result = {
            "ttl_cleanup": {
                "files_deleted": ttl_files,
                "bytes_freed": ttl_bytes
            },
            "cap_cleanup": {
                "files_deleted": cap_files,
                "bytes_freed": cap_bytes
            },
            "total": {
                "files_deleted": total_files,
                "bytes_freed": total_bytes
            }
        }
        
        logger.info(f"Cleanup completed: {total_files} files deleted, {self._format_bytes(total_bytes)} freed")
        
        return result
    
    def _format_bytes(self, bytes_val: int) -> str:
        """Format bytes to human-readable string"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if bytes_val < 1024.0:
                return f"{bytes_val:.2f} {unit}"
            bytes_val /= 1024.0
        return f"{bytes_val:.2f} PB"
