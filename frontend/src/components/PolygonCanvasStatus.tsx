interface Props {
  loading: boolean;
  error: string | null;
}

export const PolygonCanvasStatus = ({ loading, error }: Props) => {
  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-rose-300">
        {error}
      </div>
    );
  }
  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-slate-400">
        Loading background image...
      </div>
    );
  }
  return null;
};
