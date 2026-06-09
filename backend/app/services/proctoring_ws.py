from collections import defaultdict

from fastapi import WebSocket


class ProctoringConnectionManager:
    def __init__(self):
        self._session_connections: dict[int, list[WebSocket]] = defaultdict(list)
        self._global_connections: list[WebSocket] = []

    async def connect_session(self, session_id: int, websocket: WebSocket):
        await websocket.accept()
        self._session_connections[session_id].append(websocket)

    async def connect_global(self, websocket: WebSocket):
        await websocket.accept()
        self._global_connections.append(websocket)

    def disconnect_session(self, session_id: int, websocket: WebSocket):
        connections = self._session_connections.get(session_id, [])
        if websocket in connections:
            connections.remove(websocket)
        if not connections and session_id in self._session_connections:
            self._session_connections.pop(session_id, None)

    def disconnect_global(self, websocket: WebSocket):
        if websocket in self._global_connections:
            self._global_connections.remove(websocket)

    async def broadcast_violation(self, session_id: int, violation_data: dict):
        payload = {"type": "violation", **violation_data}
        await self._broadcast_to_list(self._session_connections.get(session_id, []), payload)
        await self._broadcast_to_list(self._global_connections, payload)

    async def _broadcast_to_list(self, connections: list[WebSocket], payload: dict):
        dead = []
        for websocket in list(connections):
            try:
                await websocket.send_json(payload)
            except Exception:
                dead.append(websocket)
        for websocket in dead:
            if websocket in connections:
                connections.remove(websocket)


proctoring_manager = ProctoringConnectionManager()
