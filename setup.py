from setuptools import setup, find_packages

setup(
    name="cache_simulator",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "flask>=3.0.0",
        "flask-cors>=4.0.0",
        "numpy>=1.26.2",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.3",
            "black>=23.11.0",
            "pylint>=3.0.2",
        ],
    },
    python_requires=">=3.8",
) 