import pydantic


class SimpleResponse(pydantic.BaseModel):
    """
    A simple response model that can be used to return a message.
    """
    message: str
