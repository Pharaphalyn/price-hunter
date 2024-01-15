const Balance = ({ balance, symbol, format, error }) => {
  return (
    <div className="w-full text-left mt-2 ml-2">
      <p className="font-poppins font-normal text-white text-sm">
        {balance || balance === 0 ? (
          <>
            <span className="font-semibold text-white">Balance: </span>
            <span className={error ? "text-red-500" : ""}>{format(balance, symbol)}</span>
          </>
        ) : (
          ""
        )}
      </p>
    </div>
  );
};

export default Balance;
