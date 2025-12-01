// src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from "react";

export default class ErrorBoundary extends Component<{children:ReactNode},{error: any}> {
  constructor(props:any){ super(props); this.state={error:null}; }
  static getDerivedStateFromError(error:any){ return {error}; }
  componentDidCatch(error:any, info:any){ console.error("ErrorBoundary caught:", error, info); }
  render(){
    if (this.state.error) {
      return (
        <div style={{padding:20,fontFamily:"system-ui",background:"#111",color:"#fff"}}>
          <h2>💥 App crashed</h2>
          <pre style={{whiteSpace:"pre-wrap"}}>{String(this.state.error?.stack || this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
