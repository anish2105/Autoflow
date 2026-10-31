import math
import ast
from langchain_core.tools import tool


class SafeMathEvaluator(ast.NodeVisitor):
    """Safely evaluates mathematical expressions without allowing arbitrary code execution."""
    
    ALLOWED_OPERATORS = {
        ast.Add: lambda a, b: a + b,
        ast.Sub: lambda a, b: a - b,
        ast.Mult: lambda a, b: a * b,
        ast.Div: lambda a, b: a / b,
        ast.FloorDiv: lambda a, b: a // b,
        ast.Mod: lambda a, b: a % b,
        ast.Pow: lambda a, b: a ** b,
        ast.USub: lambda a: -a,
        ast.UAdd: lambda a: a,
    }

    ALLOWED_FUNCTIONS = {
        "sqrt": math.sqrt,
        "sin": math.sin,
        "cos": math.cos,
        "tan": math.tan,
        "log": math.log,
        "log10": math.log10,
        "exp": math.exp,
        "abs": abs,
        "round": round,
        "floor": math.floor,
        "ceil": math.ceil,
        "pi": math.pi,
        "e": math.e,
    }

    def evaluate(self, expression: str):
        node = ast.parse(expression.strip(), mode="eval")
        return self.visit(node.body)

    def visit_BinOp(self, node):
        left = self.visit(node.left)
        right = self.visit(node.right)
        op_type = type(node.op)
        if op_type in self.ALLOWED_OPERATORS:
            return self.ALLOWED_OPERATORS[op_type](left, right)
        raise ValueError(f"Unsupported operator: {op_type.__name__}")

    def visit_UnaryOp(self, node):
        operand = self.visit(node.operand)
        op_type = type(node.op)
        if op_type in self.ALLOWED_OPERATORS:
            return self.ALLOWED_OPERATORS[op_type](operand)
        raise ValueError(f"Unsupported unary operator: {op_type.__name__}")

    def visit_Constant(self, node):
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError("Only numeric constants are allowed")

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name) and node.func.id in self.ALLOWED_FUNCTIONS:
            func = self.ALLOWED_FUNCTIONS[node.func.id]
            args = [self.visit(arg) for arg in node.args]
            return func(*args)
        raise ValueError(f"Function call not permitted: {getattr(node.func, 'id', 'unknown')}")

    def visit_Name(self, node):
        if node.id in self.ALLOWED_FUNCTIONS:
            return self.ALLOWED_FUNCTIONS[node.id]
        raise ValueError(f"Variable '{node.id}' is not defined")

    def generic_visit(self, node):
        raise ValueError(f"Expression type '{type(node).__name__}' is not allowed")


@tool
def calculate(expression: str) -> str:
    """Calculate the result of a mathematical expression safely.
    
    Supports basic arithmetic (+, -, *, /, //, %, **), parentheses, and math functions (sqrt, sin, cos, tan, log, log10, exp, abs, round, floor, ceil, pi, e).
    Example: calculate("sqrt(144) + 25 * 4")
    """
    try:
        evaluator = SafeMathEvaluator()
        result = evaluator.evaluate(expression)
        return f"Result of `{expression}` = {result}"
    except Exception as e:
        return f"Error evaluating expression '{expression}': {str(e)}"
