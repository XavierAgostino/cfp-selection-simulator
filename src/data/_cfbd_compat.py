"""Compatibility shim so the `cfbd` client (pydantic v1 models) imports cleanly
alongside the pydantic v2 install required by ``src.api_contracts``.

The upstream ``cfbd`` OpenAPI-generated client is pinned to ``pydantic<2`` (it
uses v1-only kwargs like ``Field(..., const=True)``) and there is no released
version compatible with pydantic v2. Since the whole process can only ever
have one module named ``pydantic`` in ``sys.modules`` at a time, we temporarily
swap it for pydantic v2's bundled ``pydantic.v1`` compatibility namespace while
``cfbd`` is first imported, then restore the real (v2) module. Once imported,
cfbd's generated model classes keep their own bound reference to the v1
``BaseModel`` they were defined against, so they keep working correctly even
after the swap is undone — and the rest of the codebase (including
``src.api_contracts.models``) sees genuine pydantic v2.

Never ``import cfbd`` directly — always ``from src.data._cfbd_compat import
cfbd, ApiException`` so the swap is guaranteed to happen first (a plain
``import cfbd`` elsewhere is exactly the ordering an import sorter will
happily break).
"""

from __future__ import annotations

import sys

import pydantic

if pydantic.VERSION.startswith("2"):
    import pydantic.v1 as _pydantic_v1  # noqa: F401  (registers pydantic.v1 submodule)

    _real_pydantic = sys.modules.get("pydantic")
    sys.modules["pydantic"] = sys.modules["pydantic.v1"]
    try:
        import cfbd  # noqa: F401  imported here, bound against the v1 shim
        from cfbd.rest import ApiException  # noqa: F401
    finally:
        if _real_pydantic is not None:
            sys.modules["pydantic"] = _real_pydantic
else:
    import cfbd  # noqa: F401
    from cfbd.rest import ApiException  # noqa: F401
