"use client";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  error: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: false };

  static getDerivedStateFromError(): State {
    return { error: true };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-3">
          <span className="text-yellow-400 text-lg">⚠️</span>
          <p className="text-gray-400 text-sm">
            {this.props.label || "This section"} failed to load.{" "}
            <button
              onClick={() => this.setState({ error: false })}
              className="text-indigo-400 hover:underline"
            >
              Retry
            </button>
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
