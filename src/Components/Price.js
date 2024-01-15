const Price = ({ price, symbol, direction }) => {
  return (
    <div className="w-full text-left mt-2 mr-2 ml-2">
      <p className={"font-poppins font-normal text-white text-sm " + (direction === "left" ? "text-left" : "text-right")}>
        {price ? (
          <>
            <span className="font-semibold text-white">1 {symbol} ≈ </span>
            {price} USD
          </>
        ) : (
          ""
        )}
      </p>
    </div>
  );
};

export default Price;
