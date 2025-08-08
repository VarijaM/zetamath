from typing import Dict, Optional, Protocol


class InMemoryDB(Protocol):
    def set(self, key: str, field: str, value: str) -> None:
        ...

    def get(self, key: str, field: str) -> Optional[str]:
        ...

    def delete(self, key: str, field: str) -> bool:
        ...


class InMemoryDBImp(InMemoryDB):
    def __init__(self) -> None:
        self._data: Dict[str, Dict[str, str]] = {}

    def set(self, key: str, field: str, value: str) -> None:
        if key not in self._data:
            self._data[key] = {}
        self._data[key][field] = value

    def get(self, key: str, field: str) -> Optional[str]:
        record = self._data.get(key)
        if record is None:
            return None
        return record.get(field)

    def delete(self, key: str, field: str) -> bool:
        record = self._data.get(key)
        if record is None or field not in record:
            return False
        del record[field]
        if not record:
            # Optionally clean up empty record container
            self._data.pop(key, None)
        return True