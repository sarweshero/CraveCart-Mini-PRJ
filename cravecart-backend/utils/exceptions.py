from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        errors = response.data
        if isinstance(errors, dict):
            flat = {}
            for key, val in errors.items():
                if isinstance(val, list):
                    flat[key] = val[0] if len(val) == 1 else val
                else:
                    flat[key] = val
            response.data = {"message": flat.get("detail", flat.get("non_field_errors", "Validation error.")), "errors": flat}
        elif isinstance(errors, list):
            response.data = {"message": errors[0] if errors else "Error.", "errors": errors}
    return response
